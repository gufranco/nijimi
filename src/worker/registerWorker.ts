import { toError } from '../logging/toError';
import type { MessagePort, WorkerHandler, WorkerReply } from './types';

const UNKNOWN_ID = -1;

export const registerWorker = (scope: MessagePort, handle: WorkerHandler): void => {
  scope.addEventListener('message', (event) => {
    handle(event.data)
      .then((reply: WorkerReply) => {
        scope.postMessage(reply.message, reply.transfer);
      })
      .catch((error: unknown) => {
        scope.postMessage({ id: UNKNOWN_ID, ok: false, message: toError(error).message }, []);
      });
  });
};
