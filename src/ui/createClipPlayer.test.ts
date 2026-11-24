import { describe, expect, it } from 'vitest';

import type { Clock } from './clipClock';
import { createClipPlayer } from './createClipPlayer';
import type { PlayerState, Scheduler } from './createClipPlayer';
import { createWallClock } from './createWallClock';

const manualScheduler = (): Scheduler & {
  readonly fire: () => void;
  readonly advance: (ms: number) => void;
  readonly pending: () => number;
} => {
  let ticks: readonly { readonly handle: number; readonly tick: (now: number) => void }[] = [];
  let next = 1;
  let time = 0;
  return {
    now: () => time,
    request: (tick) => {
      const handle = next;
      next += 1;
      ticks = [...ticks, { handle, tick }];
      return handle;
    },
    cancel: (handle) => {
      ticks = ticks.filter((entry) => entry.handle !== handle);
    },
    fire: () => {
      const due = ticks;
      ticks = [];
      due.forEach((entry) => {
        entry.tick(time);
      });
    },
    advance: (ms) => {
      time += ms;
    },
    pending: () => ticks.length
  };
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

interface Harness {
  readonly drawn: number[];
  readonly errors: unknown[];
  readonly states: PlayerState[];
  readonly scheduler: ReturnType<typeof manualScheduler>;
  readonly clock: Clock;
  readonly player: ReturnType<typeof createClipPlayer<number>>;
  readonly at: (ms: number) => Promise<void>;
}

const harness = (
  fetch: (field: number) => Promise<number> = (field) => Promise.resolve(field)
): Harness => {
  const drawn: number[] = [];
  const errors: unknown[] = [];
  const states: PlayerState[] = [];
  const scheduler = manualScheduler();
  const clock = createWallClock(scheduler.now);
  const player = createClipPlayer<number>({
    count: 3,
    fieldRate: 50,
    autoplay: true,
    clock,
    scheduler,
    fetch,
    draw: (field) => drawn.splice(drawn.length, 0, field),
    onError: (error) => errors.splice(errors.length, 0, error),
    onState: (state) => states.splice(states.length, 0, state)
  });
  const at = async (ms: number): Promise<void> => {
    scheduler.advance(ms);
    scheduler.fire();
    await settle();
  };
  return { drawn, errors, states, scheduler, clock, player, at };
};

describe('createClipPlayer', () => {
  it('starts playing and shows the field due at each tick at the field rate, looping', async () => {
    // Arrange
    const { drawn, scheduler, player, at } = harness();

    // Act
    await player.start();
    for (const ms of [10, 10, 25, 15, 1]) {
      await at(ms);
    }

    // Assert
    expect(drawn).toEqual([0, 1, 2, 0]);
    expect(scheduler.pending()).toBe(1);
  });

  it('pauses on the field shown and resumes from it, reporting each state', async () => {
    // Arrange
    const { drawn, states, player, at } = harness();
    await player.start();
    await at(25);

    // Act
    await player.pause();
    await at(100);
    await player.toggle();
    await at(20);
    await player.toggle();

    // Assert
    expect(drawn).toEqual([0, 1, 2]);
    expect(states.map((state) => [state.field, state.playing])).toEqual([
      [0, true],
      [1, true],
      [1, false],
      [1, true],
      [2, true],
      [2, false]
    ]);
    expect(states.every((state) => state.count === 3)).toBe(true);
  });

  it('steps one field back or forward while paused, wrapping at either end', async () => {
    // Arrange
    const { drawn, clock, player } = harness();
    await player.start();

    // Act
    await player.step(-1);
    await player.step(1);
    await player.step(1);

    // Assert
    expect(drawn).toEqual([0, 2, 0, 1]);
    expect(clock.playing()).toBe(false);
  });

  it('seeks to a field held inside the clip, keeping it playing or paused', async () => {
    // Arrange
    const { drawn, clock, player } = harness();
    await player.start();
    await player.seek(2);
    const playingAfterSeek = clock.playing();
    await player.pause();

    // Act
    await player.seek(7);
    await player.seek(-3);
    await player.seek(1.6);

    // Assert
    expect(drawn).toEqual([0, 2, 2, 0, 2]);
    expect([playingAfterSeek, clock.playing()]).toEqual([true, false]);
  });

  it('jumps by seconds and rewinds to the first field', async () => {
    // Arrange
    const { drawn, player } = harness();
    await player.start();

    // Act
    await player.jump(0.04);
    await player.jump(-0.02);
    await player.rewind();

    // Assert
    expect(drawn).toEqual([0, 2, 1, 0]);
  });

  it('skips fields while a fetch is loading and reports a fetch that fails', async () => {
    // Arrange
    let release: () => void = () => undefined;
    const fetch = (field: number): Promise<number> => {
      if (field === 1) {
        return new Promise((resolve) => {
          release = () => {
            resolve(field);
          };
        });
      }
      return field === 2 ? Promise.reject(new Error('read failed')) : Promise.resolve(field);
    };
    const { drawn, errors, player, at } = harness(fetch);
    await player.start();

    // Act
    await at(20);
    await at(20);
    release();
    await settle();
    await at(1);

    // Assert
    expect(drawn).toEqual([0, 1]);
    expect(errors.map((error) => (error instanceof Error ? error.message : ''))).toEqual([
      'read failed'
    ]);
  });

  it('starts once, stops ticking, and redraws the field on screen', async () => {
    // Arrange
    const { drawn, scheduler, player } = harness();
    await player.start();
    await player.start();

    // Act
    player.stop();
    player.stop();
    await player.redraw();

    // Assert
    expect([scheduler.pending(), drawn]).toEqual([0, [0, 0]]);
  });

  it('reports a clock that refuses to play and stays paused', async () => {
    // Arrange
    const errors: unknown[] = [];
    const scheduler = manualScheduler();
    const clock: Clock = {
      ...createWallClock(scheduler.now),
      play: () => Promise.reject(new Error('autoplay blocked'))
    };
    const player = createClipPlayer<number>({
      count: 3,
      fieldRate: 50,
      autoplay: true,
      clock,
      scheduler,
      fetch: (field) => Promise.resolve(field),
      draw: () => undefined,
      onError: (error) => errors.splice(errors.length, 0, error),
      onState: () => undefined
    });

    // Act
    await player.start();

    // Assert
    expect([errors.length, clock.playing()]).toEqual([1, false]);
  });

  it('waits paused on the first field when it may not play on its own', async () => {
    // Arrange
    const scheduler = manualScheduler();
    const clock = createWallClock(scheduler.now);
    const drawn: number[] = [];
    const player = createClipPlayer<number>({
      count: 3,
      fieldRate: 50,
      autoplay: false,
      clock,
      scheduler,
      fetch: (field) => Promise.resolve(field),
      draw: (field) => drawn.splice(drawn.length, 0, field),
      onError: () => undefined,
      onState: () => undefined
    });

    // Act
    await player.start();
    scheduler.advance(100);
    scheduler.fire();

    // Assert
    expect([drawn, clock.playing()]).toEqual([[0], false]);
  });
});
