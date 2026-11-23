import { createDisplay } from '../display/createDisplay';
import { createLogger } from '../logging/createLogger';
import type { AppDeps } from './types';

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

export const browserDeps = (win: Window & typeof globalThis): AppDeps => ({
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
  worker: new Worker(new URL('../worker/signal.worker.ts', import.meta.url), { type: 'module' }),
  logger: createLogger((error) => {
    win.reportError(error);
  }),
  createDisplay,
  download: (blob, name) => {
    download(win.document, blob, name);
  }
});
