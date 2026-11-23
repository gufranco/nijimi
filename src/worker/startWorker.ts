import { registerWorker } from './registerWorker';
import { workerPort } from './workerPort';

interface CandidateScope {
  readonly addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
  readonly postMessage: (message: unknown, options: StructuredSerializeOptions) => void;
}

export const startWorker = (scope: CandidateScope): boolean => {
  if (!('WorkerGlobalScope' in scope)) {
    return false;
  }
  registerWorker(workerPort(scope));
  return true;
};
