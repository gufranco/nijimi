import { handleSignalRequest } from './handleSignalRequest';
import type { MessagePort } from './types';

export const registerWorker = (scope: MessagePort): void => {
  scope.addEventListener('message', (event) => {
    const response = handleSignalRequest(event.data);
    scope.postMessage(response, response.ok ? [response.image.data.buffer] : []);
  });
};
