import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';
import type { SignalResponse } from './types';

interface WorkerLike extends EventTarget {
  readonly postMessage: (message: unknown) => void;
}

interface Pending {
  readonly resolve: (image: SignalImage) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout> | undefined;
}

export interface SignalClient {
  readonly render: (
    frames: readonly [RgbFrame, ...RgbFrame[]],
    settings: SignalSettings
  ) => Promise<SignalImage>;
}

const NOBODY: Pending = { resolve: () => undefined, reject: () => undefined, timer: undefined };

const isResponse = (data: unknown): data is SignalResponse =>
  typeof data === 'object' && data !== null && 'id' in data && 'ok' in data;

interface PendingTable {
  readonly add: (id: number, entry: Pending) => void;
  readonly take: (id: number) => Pending;
  readonly takeAll: () => readonly Pending[];
}

const createTable = (): PendingTable => {
  let pending: ReadonlyMap<number, Pending> = new Map();
  const take = (id: number): Pending => {
    const entry = pending.get(id) ?? NOBODY;
    pending = new Map([...pending].filter(([key]) => key !== id));
    clearTimeout(entry.timer);
    return entry;
  };
  return {
    add: (id: number, entry: Pending): void => {
      pending = new Map([...pending, [id, entry]]);
    },
    take,
    takeAll: (): readonly Pending[] => [...pending.keys()].map(take)
  };
};

const answer = (table: PendingTable, response: SignalResponse): void => {
  const entry = table.take(response.id);
  if (response.ok) {
    entry.resolve(response.image);
    return;
  }
  entry.reject(new Error(response.message));
};

export const createSignalClient = (input: {
  readonly worker: WorkerLike;
  readonly timeoutMs: number;
}): SignalClient => {
  const table = createTable();
  let nextId = 0;
  input.worker.addEventListener('message', (event) => {
    const data: unknown = event instanceof MessageEvent ? event.data : null;
    if (isResponse(data)) {
      answer(table, data);
    }
  });
  input.worker.addEventListener('error', (event) => {
    const reason = event instanceof ErrorEvent ? event.message : 'unknown error';
    table.takeAll().forEach((entry) => {
      entry.reject(new Error(`signal worker failed: ${reason}`));
    });
  });
  return {
    render: (frames, settings) =>
      new Promise<SignalImage>((resolve, reject) => {
        const id = nextId;
        nextId += 1;
        const timer = setTimeout(() => {
          table
            .take(id)
            .reject(new Error(`signal worker timed out after ${String(input.timeoutMs)} ms`));
        }, input.timeoutMs);
        table.add(id, { resolve, reject, timer });
        input.worker.postMessage({ id, frames, settings });
      })
  };
};
