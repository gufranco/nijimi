import { describe, expect, it } from 'vitest';

import { rowContext } from './rowContext';
import { ScanMode } from './scanMode';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const TIMING = {
  dotClockHz: 5_369_318,
  cyclesPerLine: 1364 / 6,
  linesPerFrame: 262,
  shortLineCycles: 0
};
const PAL_TIMING = {
  dotClockHz: 5_320_342,
  cyclesPerLine: 284.1667,
  linesPerFrame: 313,
  shortLineCycles: 0
};

describe('rowContext', () => {
  it('maps each progressive row to its own line', () => {
    // Arrange
    const base = {
      timing: TIMING,
      spec: STANDARDS[VideoStandard.Ntsc],
      scan: ScanMode.Progressive,
      frameIndex: 0,
      seed: 5
    };

    // Act
    const contexts = [0, 1, 2, 3].map((row) => rowContext({ ...base, row }));

    // Assert
    expect(contexts[3]?.cycles).toBeCloseTo(contexts[0]?.cycles ?? Number.NaN, 9);
    expect(contexts[1]?.lineSeconds).toBeCloseTo(
      TIMING.cyclesPerLine / STANDARDS[VideoStandard.Ntsc].subcarrierHz,
      12
    );
    expect(contexts.map((context) => context.lineSwitch)).toEqual([1, 1, 1, 1]);
  });

  it('maps two interlaced rows to the same line of their fields', () => {
    // Arrange
    const base = {
      timing: TIMING,
      spec: STANDARDS[VideoStandard.Ntsc],
      scan: ScanMode.Interlaced,
      frameIndex: 0,
      seed: 5
    };

    // Act
    const contexts = [2, 3].map((row) => rowContext({ ...base, row }));

    // Assert
    expect(contexts[0]?.lineSeconds).toBe(contexts[1]?.lineSeconds);
  });

  it('flips the PAL V switch every line and carries it across an odd-length frame', () => {
    // Arrange
    const base = {
      timing: PAL_TIMING,
      spec: STANDARDS[VideoStandard.PalBg],
      scan: ScanMode.Progressive,
      seed: 5
    };

    // Act
    const switches = [
      { frameIndex: 0, row: 0 },
      { frameIndex: 0, row: 1 },
      { frameIndex: 1, row: 0 }
    ].map((at) => rowContext({ ...base, ...at }).lineSwitch);

    // Assert
    expect(switches).toEqual([1, -1, -1]);
  });

  it('gives each row and frame its own noise seed', () => {
    // Arrange
    const base = {
      timing: TIMING,
      spec: STANDARDS[VideoStandard.Ntsc],
      scan: ScanMode.Progressive,
      seed: 5
    };

    // Act
    const seeds = [
      { frameIndex: 0, row: 0 },
      { frameIndex: 0, row: 1 },
      { frameIndex: 1, row: 0 }
    ].map((at) => rowContext({ ...base, ...at }).seed);

    // Assert
    expect(new Set(seeds).size).toBe(3);
  });
});
