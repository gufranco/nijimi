import { describe, expect, it } from 'vitest';

import { createWallClock } from './createWallClock';

const manualTime = (): { readonly now: () => number; readonly advance: (ms: number) => void } => {
  let current = 1000;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    }
  };
};

describe('createWallClock', () => {
  it('stands still until played, then runs in seconds', async () => {
    // Arrange
    const time = manualTime();
    const clock = createWallClock(time.now);
    time.advance(500);
    const idle = clock.time();

    // Act
    await clock.play();
    await clock.play();
    time.advance(250);

    // Assert
    expect([idle, clock.time(), clock.playing()]).toEqual([0, 0.25, true]);
  });

  it('holds its time while paused and resumes from it', async () => {
    // Arrange
    const time = manualTime();
    const clock = createWallClock(time.now);
    await clock.play();
    time.advance(400);

    // Act
    clock.pause();
    clock.pause();
    time.advance(1000);
    const held = clock.time();
    await clock.play();
    time.advance(100);

    // Assert
    expect([held, clock.time()]).toEqual([0.4, 0.5]);
  });

  it('seeks while playing and while paused', async () => {
    // Arrange
    const time = manualTime();
    const clock = createWallClock(time.now);
    clock.seek(2);
    const paused = clock.time();
    await clock.play();

    // Act
    clock.seek(5);
    time.advance(500);

    // Assert
    expect([paused, clock.time()]).toEqual([2, 5.5]);
  });
});
