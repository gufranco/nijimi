const MS_PER_SECOND = 1000;

export interface Scheduler {
  readonly request: (tick: (now: number) => void) => number;
  readonly cancel: (handle: number) => void;
}

export interface ClipPlayer {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly rewind: () => Promise<void>;
  readonly redraw: () => Promise<void>;
}

export const createClipPlayer = <T>(input: {
  readonly count: number;
  readonly fieldRate: number;
  readonly scheduler: Scheduler;
  readonly fetch: (index: number) => Promise<T>;
  readonly draw: (frame: T) => void;
  readonly onError: (error: unknown) => void;
}): ClipPlayer => {
  let handle: number | null = null;
  let origin: number | null = null;
  let shown = 0;
  let loading = false;
  const show = async (index: number): Promise<void> => {
    loading = true;
    shown = index;
    const frame = await input.fetch(index).finally(() => {
      loading = false;
    });
    input.draw(frame);
  };
  const tick = (now: number): void => {
    const start = origin ?? now;
    origin = start;
    const index = Math.floor(((now - start) / MS_PER_SECOND) * input.fieldRate) % input.count;
    if (index !== shown && !loading) {
      show(index).catch(input.onError);
    }
    handle = input.scheduler.request(tick);
  };
  return {
    start: async () => {
      if (handle !== null) {
        return;
      }
      handle = input.scheduler.request(tick);
      await show(shown).catch(input.onError);
    },
    stop: () => {
      if (handle !== null) {
        input.scheduler.cancel(handle);
        handle = null;
      }
    },
    rewind: async () => {
      origin = null;
      await show(0).catch(input.onError);
    },
    redraw: () => show(shown).catch(input.onError)
  };
};
