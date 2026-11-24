import type { Clock } from './clipClock';

export interface Scheduler {
  readonly now: () => number;
  readonly request: (tick: (now: number) => void) => number;
  readonly cancel: (handle: number) => void;
}

export interface PlayerState {
  readonly field: number;
  readonly count: number;
  readonly playing: boolean;
}

export interface ClipPlayer {
  readonly start: () => Promise<void>;
  readonly stop: () => void;
  readonly play: () => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly toggle: () => Promise<void>;
  readonly rewind: () => Promise<void>;
  readonly step: (fields: number) => Promise<void>;
  readonly jump: (seconds: number) => Promise<void>;
  readonly seek: (field: number) => Promise<void>;
  readonly redraw: () => Promise<void>;
}

interface PlayerInput<T> {
  readonly count: number;
  readonly fieldRate: number;
  readonly autoplay: boolean;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly fetch: (field: number) => Promise<T>;
  readonly draw: (frame: T) => void;
  readonly onError: (error: unknown) => void;
  readonly onState: (state: PlayerState) => void;
}

const wrap = (field: number, count: number): number => ((field % count) + count) % count;

export const createClipPlayer = <T>(input: PlayerInput<T>): ClipPlayer => {
  const { clock } = input;
  let handle: number | null = null;
  let shown = 0;
  let loading = false;
  const fieldAt = (seconds: number): number =>
    wrap(Math.floor(seconds * input.fieldRate), input.count);
  const emit = (): void => {
    input.onState({ field: shown, count: input.count, playing: clock.playing() });
  };
  const show = async (field: number): Promise<void> => {
    loading = true;
    shown = field;
    emit();
    const frame = await input.fetch(field).finally(() => {
      loading = false;
    });
    input.draw(frame);
  };
  const moveTo = (field: number): Promise<void> => {
    clock.seek(field / input.fieldRate);
    return show(field).catch(input.onError);
  };
  const tick = (): void => {
    const field = fieldAt(clock.time());
    if (field !== shown && !loading) {
      show(field).catch(input.onError);
    }
    handle = input.scheduler.request(tick);
  };
  const play = async (): Promise<void> => {
    await clock.play().catch(input.onError);
    emit();
  };
  const pause = (): Promise<void> => {
    clock.pause();
    emit();
    return Promise.resolve();
  };
  return {
    start: async () => {
      if (handle !== null) {
        return;
      }
      handle = input.scheduler.request(tick);
      if (input.autoplay) {
        await clock.play().catch(input.onError);
      }
      await show(shown).catch(input.onError);
    },
    stop: () => {
      if (handle !== null) {
        input.scheduler.cancel(handle);
        handle = null;
      }
    },
    play,
    pause,
    toggle: () => (clock.playing() ? pause() : play()),
    rewind: () => moveTo(0),
    step: (fields) => {
      clock.pause();
      return moveTo(wrap(shown + fields, input.count));
    },
    jump: (seconds) => moveTo(fieldAt(clock.time() + seconds)),
    seek: (field) => moveTo(Math.min(input.count - 1, Math.max(0, Math.round(field)))),
    redraw: () => show(shown).catch(input.onError)
  };
};
