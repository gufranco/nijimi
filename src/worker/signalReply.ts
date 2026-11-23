import { handleSignalRequest } from './handleSignalRequest';
import type { WorkerReply } from './types';

export const signalReply = (data: unknown): Promise<WorkerReply> => {
  const response = handleSignalRequest(data);
  return Promise.resolve({
    message: response,
    transfer: response.ok ? [response.image.data.buffer] : []
  });
};
