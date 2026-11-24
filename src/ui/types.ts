import type { Display } from '../display/types';
import type { Logger } from '../logging/createLogger';
import type { FrameStore } from '../clip/types';
import type { WorkerLike } from '../worker/createRpcClient';
import type { Scheduler } from './createClipPlayer';
import type { ExportEncoding } from './pickExportEncoding';

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
  readonly scheduler: Scheduler;
  readonly imageDecoder: typeof ImageDecoder | undefined;
  readonly exportEncoding: Promise<ExportEncoding | null>;
  readonly openStore: () => Promise<FrameStore>;
  readonly createWorker: () => WorkerLike;
  readonly workerCount: number;
}

export interface App {
  readonly idle: () => Promise<void>;
}
