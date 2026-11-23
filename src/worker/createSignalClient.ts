import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';
import { createRpcClient } from './createRpcClient';
import type { RpcAnswer, WorkerLike } from './createRpcClient';
import type { SignalResponse } from './types';

export interface SignalClient {
  readonly render: (
    frames: readonly [RgbFrame, ...RgbFrame[]],
    settings: SignalSettings
  ) => Promise<SignalImage>;
}

const isResponse = (data: unknown): data is SignalResponse =>
  typeof data === 'object' && data !== null && 'id' in data && 'ok' in data;

const readSignal = (data: unknown): RpcAnswer<SignalImage> | null => {
  if (!isResponse(data)) {
    return null;
  }
  return data.ok ? { id: data.id, ok: true, value: data.image } : data;
};

export const createSignalClient = (input: {
  readonly worker: WorkerLike;
  readonly timeoutMs: number;
}): SignalClient => {
  const rpc = createRpcClient({ ...input, label: 'signal worker', read: readSignal });
  return {
    render: (frames, settings) => rpc.call({ frames, settings })
  };
};
