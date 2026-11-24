import { DisplayKind } from '../display/displayKind';
import { required } from '../display/required';
import { detectLocale } from '../i18n/detectLocale';
import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { MessageKey } from '../i18n/types';
import { loadClip } from '../input/loadClip';
import { loadPng } from '../input/loadPng';
import { openClip } from '../input/openClip';
import type { ClipResult, ClipSource, LoadedClip, LoadedImage } from '../input/types';
import { checkImage } from '../signal/checkImage';
import { toError } from '../logging/toError';
import { parseHash } from '../settings/parseHash';
import { serializeHash } from '../settings/serializeHash';
import type { AppSettings, ParsedSettings } from '../settings/types';
import { fieldRate } from '../signal/fieldRate';
import { resolveTiming } from '../signal/resolveTiming';
import type { RgbFrame } from '../signal/types';
import { createSignalClient } from '../worker/createSignalClient';
import { createSignalPool } from '../worker/createSignalPool';
import { applyTranslations } from './applyTranslations';
import { bindFiles } from './bindFiles';
import { bindFullscreen } from './bindFullscreen';
import { bindView } from './bindView';
import { clipErrorMessage } from './clipErrorMessage';
import { createClipStage } from './createClipStage';
import { describeClip } from './describeClip';
import type { ClipStage } from './createClipStage';
import type { ViewController } from './bindView';
import { createPreview } from './createPreview';
import type { Preview } from './createPreview';
import { errorMessage } from './errorMessage';
import { exportCanvas } from './exportCanvas';
import { exportClip } from './exportClip';
import { FileSlot } from './fileSlot';
import { queryElements } from './queryElements';
import type { Elements } from './queryElements';
import { readControl } from './readControl';

import { renderConsoleCheck } from './renderConsoleCheck';
import { SHELL_HTML } from './shellHtml';
import type { App, AppDeps } from './types';
import { updateVisibility } from './updateVisibility';
import { writeControls } from './writeControls';

const SIGNAL_TIMEOUT_MS = 30_000;
const EXPORT_NAME = 'nijimi-crt.png';
const MAX_IDLE_ROUNDS = 64;

interface Notice {
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string>>;
  readonly tone: 'info' | 'error';
}

interface ClipState {
  readonly loaded: LoadedClip;
  readonly blob: Blob;
}

interface AppState {
  readonly settings: AppSettings;
  readonly mainBlob: Blob | null;
  readonly main: LoadedImage | null;
  readonly clip: ClipState | null;
  readonly flicker: RgbFrame | null;
  readonly framesVersion: number;
  readonly notice: Notice | null;
}

interface Context {
  readonly deps: AppDeps;
  readonly elements: Elements;
  readonly preview: Preview;
  readonly clips: ClipStage;
  readonly view: ViewController;
  readonly read: () => AppState;
  readonly update: (change: (state: AppState) => Partial<AppState>) => void;
  readonly track: (work: Promise<unknown>) => void;
}

const localeOf = (ctx: Context): Locale =>
  detectLocale(ctx.deps.languages, ctx.read().settings.locale);

const renderNotice = (ctx: Context): void => {
  const notice = ctx.read().notice;
  ctx.elements.notice.replaceChildren(
    notice === null ? '' : translate(localeOf(ctx), notice.key, notice.params)
  );
  ctx.elements.notice.setAttribute('data-tone', notice?.tone ?? 'info');
};

const renderCheck = (ctx: Context, main: LoadedImage): void => {
  const { signal } = ctx.read().settings;
  renderConsoleCheck({
    list: ctx.elements.consoleCheckList,
    locale: localeOf(ctx),
    report: checkImage({
      width: main.frame.width,
      height: main.frame.height,
      stats: main.stats,
      presence: main.presence,
      preset: signal.preset,
      standard: signal.standard
    })
  });
};

const renderSourceInfo = (ctx: Context): void => {
  const { main } = ctx.read();
  ctx.elements.consoleCheck.toggleAttribute('hidden', main === null);
  if (main === null) {
    ctx.elements.sourceInfo.replaceChildren('');
    return;
  }
  const locale = localeOf(ctx);
  renderCheck(ctx, main);
  const size = translate(locale, 'nativeSize', {
    width: String(main.frame.width),
    height: String(main.frame.height)
  });
  const scale =
    main.detectedScale === 1
      ? ''
      : `, ${translate(locale, 'scaleDetected', { scale: String(main.detectedScale) })}`;
  ctx.elements.sourceInfo.replaceChildren(
    size +
      scale +
      describeClip(locale, ctx.read().clip?.loaded ?? null, clipRate(ctx.read().settings))
  );
};

const clipRate = (settings: AppSettings): number =>
  fieldRate(resolveTiming(settings.signal), settings.signal.standard);

const setBusy = (ctx: Context, busy: boolean): void => {
  ctx.elements.busy.toggleAttribute('hidden', !busy);
  ctx.elements.busyProgress.replaceChildren('');
};

const setProgress = (ctx: Context, done: number, total: number): void => {
  ctx.elements.busyProgress.replaceChildren(
    translate(localeOf(ctx), 'progress', { done: String(done), total: String(total) })
  );
};

const renderTexts = (ctx: Context): void => {
  const { settings } = ctx.read();
  applyTranslations(ctx.deps.doc, localeOf(ctx));
  writeControls(ctx.elements.form, settings);
  writeControls(ctx.elements.languageForm, { ...settings, locale: localeOf(ctx) });
  updateVisibility(ctx.elements, settings);
  renderNotice(ctx);
  renderSourceInfo(ctx);
};

const notify = (ctx: Context, notice: Notice | null): void => {
  ctx.update(() => ({ notice }));
  renderNotice(ctx);
};

const reportFailure = (ctx: Context, key: MessageKey, message: string) => (error: unknown) => {
  ctx.deps.logger.error({ err: toError(error) }, message);
  notify(ctx, { key, params: {}, tone: 'error' });
};

const refreshPreview = (ctx: Context): void => {
  const { main, flicker, framesVersion, settings, clip } = ctx.read();
  if (clip !== null) {
    ctx.track(ctx.clips.show({ clip: clip.loaded, clipVersion: framesVersion, settings }));
    return;
  }
  ctx.clips.stop();
  const frames: readonly [RgbFrame, ...RgbFrame[]] | null =
    main === null ? null : flicker === null ? [main.frame] : [main.frame, flicker];
  ctx.track(ctx.preview.update({ frames, framesVersion, settings }));
};

const showLoaded = (ctx: Context): void => {
  const { main, flicker, clip } = ctx.read();
  ctx.elements.emptyState.toggleAttribute('hidden', main !== null);
  ctx.elements.exportButton.toggleAttribute('hidden', main === null || clip !== null);
  ctx.elements.exportVideoButton.toggleAttribute(
    'hidden',
    clip === null || ctx.deps.recordingType === null
  );
  ctx.elements.flickerRemoveButton.toggleAttribute('hidden', flicker === null);
  renderSourceInfo(ctx);
  refreshPreview(ctx);
};

const decodeClip = async (ctx: Context, source: ClipSource): Promise<ClipResult> => {
  setBusy(ctx, true);
  return loadClip({
    source,
    scaleOverride: ctx.read().settings.scale,
    preset: ctx.read().settings.signal.preset,
    standard: ctx.read().settings.signal.standard,
    store: await ctx.deps.openStore(),
    onProgress: (decoded) => {
      ctx.elements.busyProgress.replaceChildren(
        translate(localeOf(ctx), 'progressDecoded', { done: String(decoded) })
      );
    },
    logger: ctx.deps.logger
  });
};

const releaseClip = (ctx: Context, clip: ClipState | null): void => {
  clip?.loaded.frames.discard().catch((error: unknown) => {
    ctx.deps.logger.error({ err: error }, 'discarding the frames of a replaced clip failed');
  });
};

const loadClipFile = async (ctx: Context, file: Blob): Promise<void> => {
  const { deps } = ctx;
  const opened = await openClip({
    blob: file,
    doc: deps.doc,
    logger: deps.logger,
    Decoder: deps.imageDecoder
  });
  const result = opened.ok ? await decodeClip(ctx, opened.value) : opened;
  setBusy(ctx, false);
  if (!result.ok) {
    notify(ctx, {
      key: clipErrorMessage(result.error),
      params: { width: String(result.width), height: String(result.height) },
      tone: 'error'
    });
    return;
  }
  const loaded = result.value;
  releaseClip(ctx, ctx.read().clip);
  ctx.update((state) => ({
    main: loaded.image,
    mainBlob: null,
    clip: { loaded, blob: file },
    flicker: null,
    framesVersion: state.framesVersion + 1
  }));
  notify(ctx, null);
  ctx.view.reset();
  showLoaded(ctx);
};

const loadFile = async (ctx: Context, file: Blob, slot: FileSlot): Promise<void> => {
  if (slot === FileSlot.Clip) {
    await loadClipFile(ctx, file);
    return;
  }
  const result = await loadPng({
    blob: file,
    scaleOverride: ctx.read().settings.scale,
    logger: ctx.deps.logger
  });
  if (!result.ok) {
    notify(ctx, {
      key: errorMessage(result.error),
      params: { width: String(result.width), height: String(result.height) },
      tone: 'error'
    });
    return;
  }
  if (slot === FileSlot.Main) {
    releaseClip(ctx, ctx.read().clip);
  }
  ctx.update((state) =>
    slot === FileSlot.Main
      ? { main: result.value, mainBlob: file, clip: null, framesVersion: state.framesVersion + 1 }
      : { flicker: result.value.frame, framesVersion: state.framesVersion + 1 }
  );
  notify(
    ctx,
    slot === FileSlot.Main ? null : { key: 'flickerFrameLoaded', params: {}, tone: 'info' }
  );
  if (slot === FileSlot.Main) {
    ctx.view.reset();
  }
  showLoaded(ctx);
};

const applySettings = (ctx: Context, next: AppSettings): void => {
  const previous = ctx.read().settings;
  ctx.update(() => ({ settings: next }));
  ctx.deps.replaceHash(serializeHash(next));
  updateVisibility(ctx.elements, next);
  if (next.locale !== previous.locale) {
    renderTexts(ctx);
  } else if (next.display.crt !== previous.display.crt) {
    writeControls(ctx.elements.form, next);
  }
  const { mainBlob: blob, clip } = ctx.read();
  if (next.scale !== previous.scale && blob !== null) {
    ctx.track(loadFile(ctx, blob, FileSlot.Main));
    return;
  }
  if (clip !== null && next.scale !== previous.scale) {
    ctx.track(loadClipFile(ctx, clip.blob));
    return;
  }
  renderSourceInfo(ctx);
  refreshPreview(ctx);
};

const onControl = (ctx: Context, event: Event): void => {
  const next = readControl(ctx.read().settings, event.target);
  if (next === null) {
    return;
  }
  const target = event.target;
  if (target instanceof HTMLInputElement) {
    ctx.elements.form.querySelector(`#output-${target.name}`)?.replaceChildren(target.value);
  }
  applySettings(ctx, next);
};

const bindCompare = (elements: Elements): void => {
  elements.compareToggle.addEventListener('change', () => {
    elements.sourceCanvas.toggleAttribute('hidden', !elements.compareToggle.checked);
    elements.splitField.toggleAttribute('hidden', !elements.compareToggle.checked);
  });
  elements.compareSplit.addEventListener('input', () => {
    elements.canvasWrap.style.setProperty('--split', `${elements.compareSplit.value}%`);
  });
};

const bindActions = (ctx: Context): void => {
  const { elements, deps } = ctx;
  elements.exportButton.addEventListener('click', () => {
    ctx.preview.redraw();
    const exporting = exportCanvas({
      canvas: elements.crtCanvas,
      name: EXPORT_NAME,
      download: deps.download
    });
    ctx.track(exporting.catch(reportFailure(ctx, 'exportFailed', 'PNG export failed')));
  });
  elements.exportVideoButton.addEventListener('click', () => {
    const { clip } = ctx.read();
    const mimeType = deps.recordingType;
    if (clip === null || mimeType === null) {
      return;
    }
    const recording = exportClip({
      clip: clip.loaded,
      fieldRate: clipRate(ctx.read().settings),
      mimeType,
      canvas: elements.crtCanvas,
      wait: deps.wait,
      download: deps.download,
      onStart: ctx.clips.rewind,
      scheduler: deps.scheduler
    });
    ctx.track(recording.catch(reportFailure(ctx, 'exportVideoFailed', 'video export failed')));
  });
  elements.copyLinkButton.addEventListener('click', () => {
    const copying = deps.copyText(deps.currentUrl()).then(() => {
      notify(ctx, { key: 'linkCopied', params: {}, tone: 'info' });
    });
    ctx.track(copying.catch(reportFailure(ctx, 'copyFailed', 'copying the link failed')));
  });
};

const bindForms = (ctx: Context): void => {
  [ctx.elements.form, ctx.elements.languageForm].forEach((form) => {
    form.addEventListener('input', (event) => {
      onControl(ctx, event);
    });
    form.addEventListener('change', (event) => {
      onControl(ctx, event);
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });
  });
  ctx.elements.flickerRemoveButton.addEventListener('click', () => {
    ctx.update((state) => ({ flicker: null, framesVersion: state.framesVersion + 1 }));
    showLoaded(ctx);
  });
  bindFiles({
    elements: ctx.elements,
    doc: ctx.deps.doc,
    onFile: (file, slot) => {
      ctx.track(loadFile(ctx, file, slot));
    }
  });
};

const firstNotice = (parsed: ParsedSettings, kind: DisplayKind): Notice | null => {
  if (parsed.invalid.length > 0) {
    return {
      key: 'noticeInvalidLink',
      params: { values: parsed.invalid.join(', ') },
      tone: 'error'
    };
  }
  return kind === DisplayKind.Canvas2d ? { key: 'noticeNoWebgl', params: {}, tone: 'info' } : null;
};

interface Stages {
  readonly preview: Preview;
  readonly clips: ClipStage;
}

const createContext = (
  deps: AppDeps,
  elements: Elements,
  initial: AppState,
  stages: (ctx: () => Context) => Stages
): { readonly ctx: Context; readonly idle: () => Promise<void> } => {
  const view = bindView({ elements, doc: deps.doc });
  let state = initial;
  let pending: Promise<unknown> = Promise.resolve();
  const ctx: Context = {
    deps,
    elements,
    view,
    read: () => state,
    update: (change) => {
      state = { ...state, ...change(state) };
    },
    track: (work) => {
      const logged = work.catch((error: unknown) => {
        deps.logger.error({ err: toError(error) }, 'background task failed');
      });
      pending = Promise.all([pending, logged]);
    },
    ...stages(() => ctx)
  };
  const idle = async (): Promise<void> => {
    for (let round = 0; round < MAX_IDLE_ROUNDS; round += 1) {
      const seen = pending;
      await seen;
      if (seen === pending) {
        return;
      }
    }
  };
  return { ctx, idle };
};

export const startApp = (deps: AppDeps): App => {
  const root = required(deps.doc.querySelector('#app'), '#app container');
  root.replaceChildren(deps.doc.createRange().createContextualFragment(SHELL_HTML));
  const elements = queryElements(root);
  const parsed = parseHash(deps.hash);
  const display = deps.createDisplay(elements.crtCanvas);
  const initial: AppState = {
    settings: parsed.settings,
    mainBlob: null,
    main: null,
    clip: null,
    flicker: null,
    framesVersion: 0,
    notice: firstNotice(parsed, display.kind)
  };
  const client = createSignalClient({ worker: deps.worker, timeoutMs: SIGNAL_TIMEOUT_MS });
  const clients = createSignalPool({ first: client, deps, timeoutMs: SIGNAL_TIMEOUT_MS });
  const { ctx, idle } = createContext(deps, elements, initial, (current) => ({
    preview: createPreview({
      client,
      display,
      sourceCanvas: elements.sourceCanvas,
      onBusy: (busy) => {
        setBusy(current(), busy);
      },
      onRendered: (image) => {
        elements.frameIndex.setAttribute('max', String(image.frameCount - 1));
      },
      onError: (error) => {
        reportFailure(current(), 'errorRender', 'preview render failed')(error);
      }
    }),
    clips: createClipStage({
      clients,
      openStore: deps.openStore,
      fieldRate: clipRate,
      display,
      sourceCanvas: elements.sourceCanvas,
      scheduler: deps.scheduler,
      onBusy: (busy) => {
        setBusy(current(), busy);
      },
      onProgress: (done, total) => {
        setProgress(current(), done, total);
      },
      onError: (error) => {
        reportFailure(current(), 'errorRender', 'clip render failed')(error);
      }
    })
  }));
  renderTexts(ctx);
  bindForms(ctx);
  bindCompare(elements);
  bindActions(ctx);
  bindFullscreen({
    button: elements.fullscreenButton,
    target: elements.tv,
    doc: deps.doc,
    label: (key) => translate(localeOf(ctx), key),
    track: ctx.track,
    onError: reportFailure(ctx, 'fullscreenFailed', 'full screen request failed')
  });
  return { idle };
};
