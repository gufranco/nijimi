import { openClipDirectory } from '../clip/openClipDirectory';
import { openFrameStore } from '../clip/openFrameStore';
import { createDisplay } from '../display/createDisplay';
import { createLogger } from '../logging/createLogger';
import { pickRecordingType } from './pickRecordingType';
import type { AppDeps } from './types';

const MAX_WORKERS = 8;
const FOREVER = new Promise<void>(() => undefined);

const download = (doc: Document, blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.setAttribute('href', url);
  anchor.setAttribute('download', name);
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};

const signalWorker = (): Worker =>
  new Worker(new URL('../worker/signal.worker.ts', import.meta.url), { type: 'module' });

export const browserDeps = (win: Window & typeof globalThis): AppDeps => {
  const logger = createLogger((error) => {
    win.reportError(error);
  });
  const clips = openClipDirectory({
    storage: win.navigator.storage,
    locks: win.navigator.locks,
    id: win.crypto.randomUUID(),
    held: FOREVER,
    logger,
    page: win
  });
  return {
    doc: win.document,
    hash: win.location.hash,
    languages: win.navigator.languages,
    replaceHash: (hash) => {
      win.history.replaceState(
        null,
        '',
        hash === '' ? `${win.location.pathname}${win.location.search}` : hash
      );
    },
    currentUrl: () => win.location.href,
    copyText: (text) => win.navigator.clipboard.writeText(text),
    worker: signalWorker(),
    logger,
    createDisplay,
    download: (blob, name) => {
      download(win.document, blob, name);
    },
    scheduler: {
      now: () => win.performance.now(),
      request: (tick) => win.requestAnimationFrame(tick),
      cancel: (handle) => {
        win.cancelAnimationFrame(handle);
      }
    },
    imageDecoder: win.ImageDecoder,
    recordingType: (audio) => pickRecordingType(win.MediaRecorder, audio),
    wait: (ms) =>
      new Promise((resolve) => {
        win.setTimeout(resolve, ms);
      }),
    openStore: async () => openFrameStore({ clips: await clips, name: win.crypto.randomUUID() }),
    createWorker: signalWorker,
    workerCount: Math.max(
      1,
      Math.min(Math.floor(win.navigator.hardwareConcurrency / 2), MAX_WORKERS)
    )
  };
};
