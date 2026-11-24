import { createMemoryStore } from '../clip/createMemoryStore';
import type { Locale } from '../i18n/locale';
import { firstFrameOnly } from '../input/firstFrameOnly';
import { loadClip } from '../input/loadClip';
import { loadPng } from '../input/loadPng';
import type { ClipSource, InputResult, LoadedImage } from '../input/types';
import type { Logger } from '../logging/createLogger';
import type { AppSettings } from '../settings/types';
import { checkImage } from '../signal/checkImage';
import { describeSource } from './describeSource';
import { drawPreview } from './drawPreview';
import type { Elements } from './queryElements';
import { readControl } from './readControl';
import { renderConsoleCheck } from './renderConsoleCheck';
import { writeControls } from './writeControls';

export type PendingImport =
  | { readonly kind: 'image'; readonly blob: Blob }
  | { readonly kind: 'clip'; readonly blob: Blob; readonly source: ClipSource };

export type ConfirmedImport =
  | {
      readonly kind: 'image';
      readonly blob: Blob;
      readonly image: LoadedImage;
      readonly settings: AppSettings;
    }
  | {
      readonly kind: 'clip';
      readonly blob: Blob;
      readonly source: ClipSource;
      readonly settings: AppSettings;
    };

export interface ConfirmImport {
  readonly open: (
    pending: PendingImport,
    settings: AppSettings
  ) => Promise<InputResult<LoadedImage>>;
  readonly refresh: () => void;
}

interface ConfirmOptions {
  readonly elements: Elements;
  readonly logger: Logger;
  readonly locale: () => Locale;
  readonly track: (work: Promise<unknown>) => void;
  readonly onRender: (choice: ConfirmedImport) => void;
}

interface Draft {
  readonly pending: PendingImport;
  readonly settings: AppSettings;
  readonly image: LoadedImage;
  readonly render: boolean;
}

const preview = (
  pending: PendingImport,
  settings: AppSettings,
  logger: Logger
): Promise<InputResult<LoadedImage>> => {
  if (pending.kind === 'image') {
    return loadPng({ blob: pending.blob, scaleOverride: settings.scale, logger });
  }
  return loadClip({
    source: firstFrameOnly(pending.source),
    scaleOverride: settings.scale,
    preset: settings.signal.preset,
    standard: settings.signal.standard,
    store: createMemoryStore(),
    onProgress: () => undefined,
    logger
  }).then((result) => (result.ok ? { ok: true, value: result.value.image } : result));
};

const needsReload = (draft: Draft, next: AppSettings): boolean =>
  next.scale !== draft.settings.scale ||
  (draft.pending.kind === 'clip' &&
    (next.signal.preset !== draft.settings.signal.preset ||
      next.signal.standard !== draft.settings.signal.standard));

const show = (options: ConfirmOptions, draft: Draft): void => {
  const { elements } = options;
  const { image, settings } = draft;
  drawPreview(elements.confirmCanvas, image.frame);
  elements.confirmInfo.replaceChildren(describeSource(options.locale(), image));
  renderConsoleCheck({
    list: elements.confirmCheck,
    locale: options.locale(),
    report: checkImage({
      width: image.frame.width,
      height: image.frame.height,
      stats: image.stats,
      presence: image.presence,
      preset: settings.signal.preset,
      standard: settings.signal.standard
    })
  });
};

const confirmed = (draft: Draft): ConfirmedImport =>
  draft.pending.kind === 'image'
    ? { kind: 'image', blob: draft.pending.blob, image: draft.image, settings: draft.settings }
    : {
        kind: 'clip',
        blob: draft.pending.blob,
        source: draft.pending.source,
        settings: draft.settings
      };

const release = (pending: PendingImport): void => {
  if (pending.kind === 'clip') {
    pending.source.close();
  }
};

const listen = (
  options: ConfirmOptions,
  first: Draft,
  onShow: (redraw: () => void) => void
): void => {
  const { elements } = options;
  const listeners = new AbortController();
  const { signal } = listeners;
  let draft = first;
  const update = (next: Draft): void => {
    draft = next;
    show(options, draft);
  };
  const reload = async (current: Draft, next: AppSettings): Promise<void> => {
    const result = await preview(current.pending, next, options.logger);
    update({ ...current, settings: next, image: result.ok ? result.value : current.image });
  };
  elements.confirmForm.addEventListener(
    'change',
    (event) => {
      const next = readControl(draft.settings, event.target);
      if (next === null) {
        return;
      }
      if (needsReload(draft, next)) {
        options.track(reload(draft, next));
        return;
      }
      update({ ...draft, settings: next });
    },
    { signal }
  );
  elements.confirmForm.addEventListener(
    'submit',
    () => {
      draft = { ...draft, render: true };
    },
    { signal }
  );
  elements.confirmDialog.addEventListener(
    'close',
    () => {
      listeners.abort();
      onShow(() => undefined);
      if (draft.render) {
        options.onRender(confirmed(draft));
        return;
      }
      release(draft.pending);
    },
    { signal }
  );
  onShow(() => {
    show(options, draft);
  });
};

export const createConfirmImport = (options: ConfirmOptions): ConfirmImport => {
  const { elements } = options;
  let redraw: () => void = () => undefined;
  elements.confirmCancel.addEventListener('click', () => {
    elements.confirmDialog.close();
  });
  return {
    open: async (pending, settings) => {
      const result = await preview(pending, settings, options.logger);
      if (!result.ok) {
        release(pending);
        return result;
      }
      const draft: Draft = { pending, settings, image: result.value, render: false };
      writeControls(elements.confirmForm, settings);
      show(options, draft);
      listen(options, draft, (next) => {
        redraw = next;
      });
      elements.confirmDialog.showModal();
      return result;
    },
    refresh: () => {
      redraw();
    }
  };
};
