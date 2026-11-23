export type RpcAnswer<T> =
  | { readonly id: number; readonly ok: true; readonly value: T }
  | { readonly id: number; readonly ok: false; readonly message: string };

export interface WorkerLike extends EventTarget {
  readonly postMessage: (message: unknown) => void;
}

export interface RpcClient<T> {
  readonly call: (payload: Readonly<Record<string, unknown>>) => Promise<T>;
}

interface Pending<T> {
  readonly resolve: (value: T) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout> | undefined;
}

interface PendingTable<T> {
  readonly add: (id: number, entry: Pending<T>) => void;
  readonly take: (id: number) => Pending<T>;
  readonly takeAll: () => readonly Pending<T>[];
}

const createTable = <T>(): PendingTable<T> => {
  const nobody: Pending<T> = {
    resolve: () => undefined,
    reject: () => undefined,
    timer: undefined
  };
  let pending: ReadonlyMap<number, Pending<T>> = new Map();
  const take = (id: number): Pending<T> => {
    const entry = pending.get(id) ?? nobody;
    pending = new Map([...pending].filter(([key]) => key !== id));
    clearTimeout(entry.timer);
    return entry;
  };
  return {
    add: (id, entry) => {
      pending = new Map([...pending, [id, entry]]);
    },
    take,
    takeAll: () => [...pending.keys()].map(take)
  };
};

const answer = <T>(table: PendingTable<T>, reply: RpcAnswer<T>): void => {
  const entry = table.take(reply.id);
  if (reply.ok) {
    entry.resolve(reply.value);
    return;
  }
  entry.reject(new Error(reply.message));
};

const listen = <T>(input: RpcInput<T>, table: PendingTable<T>): void => {
  input.worker.addEventListener('message', (event) => {
    const reply = input.read(event instanceof MessageEvent ? event.data : null);
    if (reply !== null) {
      answer(table, reply);
    }
  });
  input.worker.addEventListener('error', (event) => {
    const reason = event instanceof ErrorEvent ? event.message : 'unknown error';
    table.takeAll().forEach((entry) => {
      entry.reject(new Error(`${input.label} failed: ${reason}`));
    });
  });
};

interface RpcInput<T> {
  readonly worker: WorkerLike;
  readonly timeoutMs: number;
  readonly label: string;
  readonly read: (data: unknown) => RpcAnswer<T> | null;
}

export const createRpcClient = <T>(input: RpcInput<T>): RpcClient<T> => {
  const table = createTable<T>();
  let nextId = 0;
  listen(input, table);
  return {
    call: (payload) =>
      new Promise<T>((resolve, reject) => {
        const id = nextId;
        nextId += 1;
        const timer = setTimeout(() => {
          table
            .take(id)
            .reject(new Error(`${input.label} timed out after ${String(input.timeoutMs)} ms`));
        }, input.timeoutMs);
        table.add(id, { resolve, reject, timer });
        input.worker.postMessage({ ...payload, id });
      })
  };
};
