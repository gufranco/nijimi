import { registerWorker } from './registerWorker';
import type { WorkerHandler } from './types';
import { workerPort } from './workerPort';

interface CandidateScope {
  readonly addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  readonly postMessage: (message: unknown, options: StructuredSerializeOptions) => void;
}

export const startWorker = (scope: CandidateScope, handle: WorkerHandler): boolean => {
  if (!('WorkerGlobalScope' in scope)) {
    return false;
  }
  registerWorker(workerPort(scope), handle);
  return true;
};
