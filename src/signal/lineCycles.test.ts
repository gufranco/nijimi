import { describe, expect, it } from 'vitest';

import { lineCycles } from './lineCycles';

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
const BROADCAST_NTSC = {
  dotClockHz: 7_159_090,
  cyclesPerLine: 227.5,
  linesPerFrame: 262,
  shortLineCycles: 0
};

const fraction = (value: number): number => value - Math.floor(value);

describe('lineCycles', () => {
  it('advances the NES chroma phase by a third of a cycle per line', () => {
    // Arrange
    const lines = [0, 1, 2, 3];

    // Act
    const phases = lines.map((line) => lineCycles(NES_NTSC, 0, line));

    // Assert
    expect(fraction((phases[1] ?? 0) - (phases[0] ?? 0))).toBeCloseTo(1 / 3, 9);
    expect(fraction((phases[2] ?? 0) - (phases[0] ?? 0))).toBeCloseTo(2 / 3, 9);
    expect(phases[3]).toBeCloseTo(phases[0] ?? Number.NaN, 9);
  });

  it('keeps every Genesis line on the same phase', () => {
    // Arrange
    const lines = [0, 1, 57, 223];

    // Act
    const phases = lines.map((line) => lineCycles(GENESIS_NTSC, 0, line));

    // Assert
    phases.forEach((phase) => {
      expect(phase).toBeCloseTo(0, 6);
    });
  });

  it('flips broadcast NTSC by half a cycle per line', () => {
    // Arrange
    const lines = [0, 1];

    // Act
    const phases = lines.map((line) => lineCycles(BROADCAST_NTSC, 0, line));

    // Assert
    expect(fraction((phases[1] ?? 0) - (phases[0] ?? 0))).toBeCloseTo(0.5, 9);
  });

  it('moves the NES frame start by a third, and back after the odd frame drops a dot', () => {
    // Arrange
    const frames = [0, 1, 2];

    // Act
    const starts = frames.map((frame) => lineCycles(NES_NTSC, frame, 0));

    // Assert
    expect(fraction((starts[1] ?? 0) - (starts[0] ?? 0))).toBeCloseTo(1 / 3, 6);
    expect(fraction((starts[2] ?? 0) - (starts[0] ?? 0) + 1e-9)).toBeCloseTo(0, 6);
  });

  it('returns a phase in the unit interval', () => {
    // Arrange
    const frame = 5;

    // Act
    const phase = lineCycles(NES_NTSC, frame, 199);

    // Assert
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(1);
  });
});
