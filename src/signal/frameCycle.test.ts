import { describe, expect, it } from 'vitest';

import { frameCycle } from './frameCycle';
import { ScanMode } from './scanMode';

const NES_NTSC = {
  dotClockHz: 5_369_318,
  cyclesPerLine: 1364 / 6,
  linesPerFrame: 262,
  shortLineCycles: 4 / 6
};
const GENESIS_NTSC = {
  dotClockHz: 6_711_647,
  cyclesPerLine: 228,
  linesPerFrame: 262,
  shortLineCycles: 0
};
const IRRATIONAL = {
  dotClockHz: 5e6,
  cyclesPerLine: Math.SQRT2 * 100,
  linesPerFrame: 262,
  shortLineCycles: 0
};

describe('frameCycle', () => {
  it('repeats the NES dot crawl every 2 frames', () => {
    // Arrange
    const input = { timing: NES_NTSC, scan: ScanMode.Progressive, sourceFrames: 1 };

    // Act
    const count = frameCycle(input);

    // Assert
    expect(count).toBe(2);
  });

  it('holds the Genesis pattern still in 1 frame', () => {
    // Arrange
    const input = { timing: GENESIS_NTSC, scan: ScanMode.Progressive, sourceFrames: 1 };

    // Act
    const count = frameCycle(input);

    // Assert
    expect(count).toBe(1);
  });

  it('spans both fields when interlaced', () => {
    // Arrange
    const input = { timing: GENESIS_NTSC, scan: ScanMode.Interlaced, sourceFrames: 1 };

    // Act
    const count = frameCycle(input);

    // Assert
    expect(count).toBe(2);
  });

  it('covers a flicker pair and a 2-frame crawl in their common multiple', () => {
    // Arrange
    const input = { timing: NES_NTSC, scan: ScanMode.Progressive, sourceFrames: 3 };

    // Act
    const count = frameCycle(input);

    // Assert
    expect(count).toBe(6);
  });

  it('caps a phase that never repeats at 12 frames', () => {
    // Arrange
    const input = { timing: IRRATIONAL, scan: ScanMode.Progressive, sourceFrames: 1 };

    // Act
    const count = frameCycle(input);

    // Assert
    expect(count).toBe(12);
  });
});
