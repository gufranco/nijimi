import { createSignalClient } from './createSignalClient';
import type { SignalClient } from './createSignalClient';
import type { WorkerLike } from './createRpcClient';

type Pool = readonly [SignalClient, ...SignalClient[]];

export const createSignalPool = (input: {
  readonly first: SignalClient;
  readonly deps: { readonly createWorker: () => WorkerLike; readonly workerCount: number };
  readonly timeoutMs: number;
}): (() => Pool) => {
  let pool: Pool | null = null;
  return () => {
    pool ??= [
      input.first,
      ...Array.from({ length: input.deps.workerCount - 1 }, () =>
        createSignalClient({ worker: input.deps.createWorker(), timeoutMs: input.timeoutMs })
      )
    ];
    return pool;
  };
};
