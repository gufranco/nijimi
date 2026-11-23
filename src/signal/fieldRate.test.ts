import { describe, expect, it } from 'vitest';

import { ConsolePreset } from './consolePreset';
import { fieldRate } from './fieldRate';
import { resolveTiming } from './resolveTiming';
import { VideoStandard } from './videoStandard';

const CUSTOM = { dotClockHz: 6e6, cyclesPerLine: 228 };

describe('fieldRate', () => {
  it.each([
    [ConsolePreset.Nes, VideoStandard.Ntsc, 5_369_318.18 / (341 * 262 - 0.5)],
    [ConsolePreset.Nes, VideoStandard.PalBg, 5_320_342.5 / (341 * 312)],
    [ConsolePreset.GenesisH40, VideoStandard.Ntsc, 53_693_175 / (3420 * 262)],
    [ConsolePreset.Snes256, VideoStandard.Ntsc, 21_477_272.7 / (1364 * 262 - 2)]
  ])('gives %s on %s the field rate worked from its clocks', (preset, standard, expected) => {
    // Arrange
    const timing = resolveTiming({ preset, standard, custom: CUSTOM });

    // Act
    const rate = fieldRate(timing, standard);

    // Assert
    expect(rate).toBeCloseTo(expected, 3);
  });
});
