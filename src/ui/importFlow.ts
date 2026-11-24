import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { MessageKey } from '../i18n/types';
import { loadClip } from '../input/loadClip';
import { loadPng } from '../input/loadPng';
import { openClip } from '../input/openClip';
import type { ClipResult, ClipSource, LoadedImage } from '../input/types';
import type { AppSettings } from '../settings/types';
import type { AppState, ClipState, Notice } from './appState';
import { clipErrorMessage } from './clipErrorMessage';
import type { ConfirmedImport, ConfirmImport, PendingImport } from './confirmImport';
import { errorMessage } from './errorMessage';
import { FileSlot } from './fileSlot';
import type { Elements } from './queryElements';
import type { ViewController } from './bindView';
import type { AppDeps } from './types';

export interface ImportHost {
  readonly deps: AppDeps;
  readonly elements: Elements;
  readonly view: ViewController;
  readonly confirm: ConfirmImport;
  readonly read: () => AppState;
  readonly update: (change: (state: AppState) => Partial<AppState>) => void;
  readonly track: (work: Promise<unknown>) => void;
  readonly notify: (notice: Notice | null) => void;
  readonly setBusy: (busy: boolean) => void;
  readonly showLoaded: () => void;
  readonly locale: () => Locale;
  readonly adopt: (settings: AppSettings) => void;
}

export interface ImportFlow {
  readonly loadFile: (file: Blob, slot: FileSlot) => Promise<void>;
  readonly onConfirmed: (choice: ConfirmedImport) => void;
  readonly reloadPicture: (file: Blob) => Promise<void>;
  readonly reloadClip: (file: Blob) => Promise<void>;
}

const decodeClip = async (host: ImportHost, source: ClipSource): Promise<ClipResult> => {
  host.setBusy(true);
  return loadClip({
    source,
    scaleOverride: host.read().settings.scale,
    preset: host.read().settings.signal.preset,
    standard: host.read().settings.signal.standard,
    store: await host.deps.openStore(),
    onProgress: (decoded) => {
      host.elements.busyProgress.replaceChildren(
        translate(host.locale(), 'progressDecoded', { done: String(decoded) })
      );
    },
    logger: host.deps.logger
  });
};

const releaseClip = (host: ImportHost, clip: ClipState | null): void => {
  clip?.loaded.frames.discard().catch((error: unknown) => {
    host.deps.logger.error({ err: error }, 'discarding the frames of a replaced clip failed');
  });
};

const notifyRefusal = (
  host: ImportHost,
  key: MessageKey,
  refused: { readonly width: number; readonly height: number }
): void => {
  host.notify({
    key,
    params: { width: String(refused.width), height: String(refused.height) },
    tone: 'error'
  });
};

const commitClip = async (host: ImportHost, source: ClipSource, file: Blob): Promise<void> => {
  const result = await decodeClip(host, source);
  host.setBusy(false);
  if (!result.ok) {
    notifyRefusal(host, clipErrorMessage(result.error), result);
    return;
  }
  const loaded = result.value;
  releaseClip(host, host.read().clip);
  host.update((state) => ({
    main: loaded.image,
    mainBlob: null,
    clip: { loaded, blob: file },
    flicker: null,
    framesVersion: state.framesVersion + 1
  }));
  host.notify(null);
  host.view.reset();
  host.showLoaded();
};

const openClipSource = async (host: ImportHost, file: Blob): Promise<ClipSource | null> => {
  const { deps } = host;
  const opened = await openClip({
    blob: file,
    doc: deps.doc,
    logger: deps.logger,
    Decoder: deps.imageDecoder
  });
  if (!opened.ok) {
    notifyRefusal(host, clipErrorMessage(opened.error), opened);
    return null;
  }
  return opened.value;
};

const loadClipFile = async (host: ImportHost, file: Blob): Promise<void> => {
  const source = await openClipSource(host, file);
  if (source !== null) {
    await commitClip(host, source, file);
  }
};

const commitImage = (host: ImportHost, image: LoadedImage, file: Blob): void => {
  releaseClip(host, host.read().clip);
  host.update((state) => ({
    main: image,
    mainBlob: file,
    clip: null,
    framesVersion: state.framesVersion + 1
  }));
  host.notify(null);
  host.view.reset();
  host.showLoaded();
};

const loadPicture = async (
  host: ImportHost,
  file: Blob,
  onLoaded: (image: LoadedImage) => void
): Promise<void> => {
  const result = await loadPng({
    blob: file,
    scaleOverride: host.read().settings.scale,
    logger: host.deps.logger
  });
  if (!result.ok) {
    notifyRefusal(host, errorMessage(result.error), result);
    return;
  }
  onLoaded(result.value);
};

const loadFlicker = (host: ImportHost, file: Blob): Promise<void> =>
  loadPicture(host, file, (image) => {
    host.update((state) => ({ flicker: image.frame, framesVersion: state.framesVersion + 1 }));
    host.notify({ key: 'flickerFrameLoaded', params: {}, tone: 'info' });
    host.showLoaded();
  });

const pendingImport = async (
  host: ImportHost,
  file: Blob,
  slot: FileSlot
): Promise<PendingImport | null> => {
  if (slot !== FileSlot.Clip) {
    return { kind: 'image', blob: file };
  }
  const source = await openClipSource(host, file);
  return source === null ? null : { kind: 'clip', blob: file, source };
};

const askToRender = async (host: ImportHost, file: Blob, slot: FileSlot): Promise<void> => {
  const pending = await pendingImport(host, file, slot);
  if (pending === null) {
    return;
  }
  const result = await host.confirm.open(pending, host.read().settings);
  if (!result.ok) {
    const key =
      pending.kind === 'clip' ? clipErrorMessage(result.error) : errorMessage(result.error);
    notifyRefusal(host, key, result);
  }
};

const loadFile = (host: ImportHost, file: Blob, slot: FileSlot): Promise<void> =>
  slot === FileSlot.Flicker ? loadFlicker(host, file) : askToRender(host, file, slot);

const onConfirmed = (host: ImportHost, choice: ConfirmedImport): void => {
  host.adopt(choice.settings);
  if (choice.kind === 'image') {
    commitImage(host, choice.image, choice.blob);
    return;
  }
  host.track(commitClip(host, choice.source, choice.blob));
};

export const createImportFlow = (host: ImportHost): ImportFlow => ({
  loadFile: (file, slot) => loadFile(host, file, slot),
  onConfirmed: (choice) => {
    onConfirmed(host, choice);
  },
  reloadPicture: (file) =>
    loadPicture(host, file, (image) => {
      commitImage(host, image, file);
    }),
  reloadClip: (file) => loadClipFile(host, file)
});
