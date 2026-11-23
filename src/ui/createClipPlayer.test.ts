import { describe, expect, it } from 'vitest';

import { createClipPlayer } from './createClipPlayer';
import type { Scheduler } from './createClipPlayer';

const manualScheduler = (): Scheduler & {
  readonly fire: (now: number) => void;
  readonly pending: () => number;
  readonly cancelled: number[];
} => {
  let ticks: readonly { readonly handle: number; readonly tick: (now: number) => void }[] = [];
  let next = 1;
  const cancelled: number[] = [];
  return {
    request: (tick) => {
      const handle = next;
      next += 1;
      ticks = [...ticks, { handle, tick }];
      return handle;
    },
    cancel: (handle) => {
      cancelled.splice(cancelled.length, 0, handle);
      ticks = ticks.filter((entry) => entry.handle !== handle);
    },
    fire: (now) => {
      const due = ticks;
      ticks = [];
      due.forEach((entry) => {
        entry.tick(now);
      });
    },
    pending: () => ticks.length,
    cancelled
  };
};

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const harness = (
  fetch: (index: number) => Promise<number> = (index) => Promise.resolve(index)
): {
  readonly drawn: number[];
  readonly errors: unknown[];
  readonly scheduler: ReturnType<typeof manualScheduler>;
  readonly player: ReturnType<typeof createClipPlayer>;
} => {
  const drawn: number[] = [];
  const errors: unknown[] = [];
  const scheduler = manualScheduler();
  const player = createClipPlayer({
    count: 3,
    fieldRate: 50,
    scheduler,
    fetch,
    draw: (index) => drawn.splice(drawn.length, 0, index),
    onError: (error) => errors.splice(errors.length, 0, error)
  });
  return { drawn, errors, scheduler, player };
};

describe('createClipPlayer', () => {
  it('fetches and shows the field due at each tick at the field rate, looping', async () => {
    // Arrange
    const { drawn, scheduler, player } = harness();
    await player.start();

    // Act
    for (const now of [1000, 1010, 1020, 1045, 1060, 1061]) {
      scheduler.fire(now);
      await settle();
    }

    // Assert
    expect(drawn).toEqual([0, 1, 2, 0]);
    expect(scheduler.pending()).toBe(1);
  });

  it('skips fields while a fetch is still loading', async () => {
    // Arrange
    let release: () => void = () => undefined;
    const slow = (index: number): Promise<number> =>
      index === 1
        ? new Promise((resolve) => {
            release = () => {
              resolve(index);
            };
          })
        : Promise.resolve(index);
    const { drawn, scheduler, player } = harness(slow);
    await player.start();

    // Act
    scheduler.fire(0);
    scheduler.fire(20);
    scheduler.fire(40);
    release();
    await settle();

    // Assert
    expect(drawn).toEqual([0, 1]);
  });

  it('reports a fetch that fails during playback', async () => {
    // Arrange
    const failing = (index: number): Promise<number> =>
      index === 0 ? Promise.resolve(0) : Promise.reject(new Error('read failed'));
    const { errors, scheduler, player } = harness(failing);
    await player.start();

    // Act
    scheduler.fire(0);
    scheduler.fire(25);
    await settle();

    // Assert
    expect(errors.map((error) => (error instanceof Error ? error.message : ''))).toEqual([
      'read failed'
    ]);
  });

  it('reports a fetch that fails when starting, rewinding or redrawing', async () => {
    // Arrange
    const { errors, player } = harness(() => Promise.reject(new Error('gone')));

    // Act
    await player.start();
    await player.rewind();
    await player.redraw();

    // Assert
    expect(errors).toHaveLength(3);
  });

  it('starts once, stops by cancelling the pending tick and stops only once', async () => {
    // Arrange
    const { scheduler, player } = harness();
    await player.start();
    await player.start();

    // Act
    player.stop();
    player.stop();

    // Assert
    expect(scheduler.cancelled).toEqual([1]);
    expect(scheduler.pending()).toBe(0);
  });

  it('rewinds to the first field and restarts the clock at the next tick', async () => {
    // Arrange
    const { drawn, scheduler, player } = harness();
    await player.start();
    scheduler.fire(0);
    scheduler.fire(25);
    await settle();

    // Act
    await player.rewind();
    scheduler.fire(500);
    scheduler.fire(520);
    await settle();

    // Assert
    expect(drawn).toEqual([0, 1, 0, 1]);
  });

  it('redraws the field on screen without moving the clip', async () => {
    // Arrange
    const { drawn, scheduler, player } = harness();
    await player.start();
    scheduler.fire(0);
    scheduler.fire(45);
    await settle();

    // Act
    await player.redraw();

    // Assert
    expect(drawn).toEqual([0, 2, 2]);
  });
});
