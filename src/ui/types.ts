import type { Display } from '../display/types';
import type { Logger } from '../logging/createLogger';

export interface AppDeps {
  readonly doc: Document;
  readonly hash: string;
  readonly languages: readonly string[];
  readonly replaceHash: (hash: string) => void;
  readonly currentUrl: () => string;
  readonly copyText: (text: string) => Promise<void>;
  readonly worker: EventTarget & { readonly postMessage: (message: unknown) => void };
  readonly logger: Logger;
  readonly createDisplay: (canvas: HTMLCanvasElement) => Display;
  readonly download: (blob: Blob, name: string) => void;
}

export interface App {
  readonly idle: () => Promise<void>;
}
