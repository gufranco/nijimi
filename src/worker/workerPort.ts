import type { MessagePort } from './types';

interface WorkerScope {
  readonly addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  readonly postMessage: (message: unknown, options: StructuredSerializeOptions) => void;
}

export const workerPort = (scope: WorkerScope): MessagePort => ({
  addEventListener: (type, listener) => {
    scope.addEventListener(type, listener);
  },
  postMessage: (message, transfer) => {
    scope.postMessage(message, { transfer });
  }
});
