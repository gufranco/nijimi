import { DisplayKind } from '../display/displayKind';
import { required } from '../display/required';
import { detectLocale } from '../i18n/detectLocale';
import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { MessageKey } from '../i18n/types';
import { loadPng } from '../input/loadPng';
import type { LoadedImage } from '../input/types';
import { toError } from '../logging/toError';
import { parseHash } from '../settings/parseHash';
import { serializeHash } from '../settings/serializeHash';
import type { AppSettings, ParsedSettings } from '../settings/types';
import type { RgbFrame } from '../signal/types';
import { createSignalClient } from '../worker/createSignalClient';
import { applyTranslations } from './applyTranslations';
import { bindFiles } from './bindFiles';
import { createPreview } from './createPreview';
import type { Preview } from './createPreview';
import { errorMessage } from './errorMessage';
import { exportCanvas } from './exportCanvas';
import { FileSlot } from './fileSlot';
import { queryElements } from './queryElements';
import type { Elements } from './queryElements';
import { readControl } from './readControl';
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

interface AppState {
  readonly settings: AppSettings;
  readonly mainBlob: Blob | null;
  readonly main: LoadedImage | null;
  readonly flicker: RgbFrame | null;
  readonly framesVersion: number;
  readonly notice: Notice | null;
}

interface Context {
  readonly deps: AppDeps;
  readonly elements: Elements;
  readonly preview: Preview;
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

const renderSourceInfo = (ctx: Context): void => {
  const main = ctx.read().main;
  if (main === null) {
    ctx.elements.sourceInfo.replaceChildren('');
    return;
  }
  const locale = localeOf(ctx);
  const size = translate(locale, 'nativeSize', {
    width: String(main.frame.width),
    height: String(main.frame.height)
  });
  const scale =
    main.detectedScale === 1
      ? ''
      : `, ${translate(locale, 'scaleDetected', { scale: String(main.detectedScale) })}`;
  ctx.elements.sourceInfo.replaceChildren(size + scale);
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
  const { main, flicker, framesVersion, settings } = ctx.read();
  const frames: readonly [RgbFrame, ...RgbFrame[]] | null =
    main === null ? null : flicker === null ? [main.frame] : [main.frame, flicker];
  ctx.track(ctx.preview.update({ frames, framesVersion, settings }));
};

const showLoaded = (ctx: Context): void => {
  const { main, flicker } = ctx.read();
  ctx.elements.emptyState.toggleAttribute('hidden', main !== null);
  ctx.elements.exportButton.toggleAttribute('disabled', main === null);
  ctx.elements.flickerRemoveButton.toggleAttribute('hidden', flicker === null);
  renderSourceInfo(ctx);
  refreshPreview(ctx);
};

const loadFile = async (ctx: Context, file: Blob, slot: FileSlot): Promise<void> => {
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
  ctx.update((state) =>
    slot === FileSlot.Main
      ? { main: result.value, mainBlob: file, framesVersion: state.framesVersion + 1 }
      : { flicker: result.value.frame, framesVersion: state.framesVersion + 1 }
  );
  notify(
    ctx,
    slot === FileSlot.Main ? null : { key: 'flickerFrameLoaded', params: {}, tone: 'info' }
  );
  showLoaded(ctx);
};

const applySettings = (ctx: Context, next: AppSettings): void => {
  const previous = ctx.read().settings;
  ctx.update(() => ({ settings: next }));
  ctx.deps.replaceHash(serializeHash(next));
  updateVisibility(ctx.elements, next);
  if (next.locale !== previous.locale) {
    renderTexts(ctx);
  }
  const blob = ctx.read().mainBlob;
  if (next.scale !== previous.scale && blob !== null) {
    ctx.track(loadFile(ctx, blob, FileSlot.Main));
    return;
  }
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

const bindCompare = (elements: Elements, doc: Document): void => {
  elements.compareToggle.addEventListener('change', () => {
    elements.sourceCanvas.toggleAttribute('hidden', !elements.compareToggle.checked);
    elements.splitField.toggleAttribute('hidden', !elements.compareToggle.checked);
  });
  elements.compareSplit.addEventListener('input', () => {
    elements.canvasWrap.style.setProperty('--split', `${elements.compareSplit.value}%`);
  });
  doc.querySelectorAll<HTMLInputElement>('input[name="zoom"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      elements.canvasWrap.setAttribute('data-zoom', radio.value);
    });
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

const createContext = (
  deps: AppDeps,
  elements: Elements,
  initial: AppState,
  preview: (ctx: () => Context) => Preview
): { readonly ctx: Context; readonly idle: () => Promise<void> } => {
  let state = initial;
  let pending: Promise<unknown> = Promise.resolve();
  const ctx: Context = {
    deps,
    elements,
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
    preview: preview(() => ctx)
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
    flicker: null,
    framesVersion: 0,
    notice: firstNotice(parsed, display.kind)
  };
  const { ctx, idle } = createContext(deps, elements, initial, (current) =>
    createPreview({
      client: createSignalClient({ worker: deps.worker, timeoutMs: SIGNAL_TIMEOUT_MS }),
      display,
      sourceCanvas: elements.sourceCanvas,
      onBusy: (busy) => {
        elements.busy.toggleAttribute('hidden', !busy);
      },
      onRendered: (image) => {
        elements.frameIndex.setAttribute('max', String(image.frameCount - 1));
      },
      onError: (error) => {
        reportFailure(current(), 'errorRender', 'preview render failed')(error);
      }
    })
  );
  renderTexts(ctx);
  bindForms(ctx);
  bindCompare(elements, deps.doc);
  bindActions(ctx);
  return { idle };
};
