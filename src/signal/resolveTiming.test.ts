import { describe, expect, it } from 'vitest';

import { ConsolePreset } from './consolePreset';
import { resolveTiming } from './resolveTiming';
import { VideoStandard } from './videoStandard';

const CUSTOM = { dotClockHz: 7_159_090, cyclesPerLine: 227.5 };

describe('resolveTiming', () => {
  it.each([
    [ConsolePreset.Nes, VideoStandard.Ntsc, 5_369_318, 227.3333],
    [ConsolePreset.Nes, VideoStandard.PalBg, 5_320_342, 284.1667],
    [ConsolePreset.Snes256, VideoStandard.Ntsc, 5_369_318, 227.3333],
    [ConsolePreset.Snes512, VideoStandard.Ntsc, 10_738_636, 227.3333],
    [ConsolePreset.GenesisH32, VideoStandard.Ntsc, 5_369_318, 228],
    [ConsolePreset.GenesisH40, VideoStandard.Ntsc, 6_711_647, 228],
    [ConsolePreset.GenesisH40, VideoStandard.PalBg, 6_650_428, 285],
    [ConsolePreset.MasterSystem, VideoStandard.Ntsc, 5_369_318, 228],
    [ConsolePreset.Ps1W256, VideoStandard.Ntsc, 5_369_318, 227.5333],
    [ConsolePreset.Ps1W320, VideoStandard.Ntsc, 6_711_647, 227.5333],
    [ConsolePreset.Ps1W368, VideoStandard.Ntsc, 7_670_454, 227.5333],
    [ConsolePreset.Ps1W512, VideoStandard.Ntsc, 10_738_635, 227.5333],
    [ConsolePreset.Ps1W640, VideoStandard.PalBg, 13_300_856, 283.8333],
    [ConsolePreset.Sg1000, VideoStandard.Ntsc, 5_369_318, 228],
    [ConsolePreset.Sg1000, VideoStandard.PalBg, 5_369_318, 282.4004],
    [ConsolePreset.Sega32x, VideoStandard.Ntsc, 6_711_647, 228],
    [ConsolePreset.Atari2600, VideoStandard.Ntsc, 3_579_545, 228],
    [ConsolePreset.Atari2600, VideoStandard.PalBg, 3_546_894, 285],
    [ConsolePreset.Atari7800W160, VideoStandard.Ntsc, 3_579_545, 227],
    [ConsolePreset.Atari7800W320, VideoStandard.Ntsc, 7_159_091, 227],
    [ConsolePreset.Atari7800W320, VideoStandard.PalBg, 7_093_790, 283.75],
    [ConsolePreset.Atari5200W160, VideoStandard.Ntsc, 3_579_545, 228],
    [ConsolePreset.Atari5200W320, VideoStandard.PalBg, 7_093_790, 285],
    [ConsolePreset.N64W320, VideoStandard.Ntsc, 6_085_227, 227.5],
    [ConsolePreset.N64W640, VideoStandard.PalBg, 12_414_133, 283.75],
    [ConsolePreset.SaturnW320, VideoStandard.Ntsc, 6_711_647, 227.7333],
    [ConsolePreset.SaturnW352, VideoStandard.Ntsc, 7_159_091, 227.5],
    [ConsolePreset.SaturnW704, VideoStandard.Ntsc, 14_318_182, 227.5],
    [ConsolePreset.GameBoy, VideoStandard.Ntsc, 6_136_364, 227.5],
    [ConsolePreset.GameGear, VideoStandard.PalBg, 7_375_000, 283.75],
    [ConsolePreset.JaguarW320, VideoStandard.Ntsc, 6_647_727, 227.5],
    [ConsolePreset.JaguarW256, VideoStandard.PalBg, 5_318_780, 283.75]
  ])(
    'gives %s on %s a dot clock of %d Hz and %d cycles per line',
    (preset, standard, dotClock, cycles) => {
      // Arrange
      const input = { preset, standard, custom: CUSTOM };

      // Act
      const timing = resolveTiming(input);

      // Assert
      expect(Math.abs(timing.dotClockHz - dotClock)).toBeLessThan(2);
      expect(timing.cyclesPerLine).toBeCloseTo(cycles, 3);
    }
  );

  it('runs a PAL-M console on 60 Hz timing with its clock locked to the PAL-M subcarrier', () => {
    // Arrange
    const input = {
      preset: ConsolePreset.GenesisH40,
      standard: VideoStandard.PalM,
      custom: CUSTOM
    };

    // Act
    const timing = resolveTiming(input);

    // Assert
    expect(timing.linesPerFrame).toBe(262);
    expect(timing.cyclesPerLine).toBe(228);
    expect(timing.dotClockHz).toBeCloseTo((3_575_611.49 * 15) / 8, 3);
  });

  it('drops one NES dot on odd frames as a 2/3 subcarrier cycle', () => {
    // Arrange
    const input = { preset: ConsolePreset.Nes, standard: VideoStandard.Ntsc, custom: CUSTOM };

    // Act
    const timing = resolveTiming(input);

    // Assert
    expect(timing.shortLineCycles).toBeCloseTo(2 / 3, 4);
  });

  it('takes the dot clock and line length from the custom timing', () => {
    // Arrange
    const input = { preset: ConsolePreset.Custom, standard: VideoStandard.PalBg, custom: CUSTOM };

    // Act
    const timing = resolveTiming(input);

    // Assert
    expect(timing).toEqual({
      dotClockHz: 7_159_090,
      cyclesPerLine: 227.5,
      linesPerFrame: 312,
      shortLineCycles: 0
    });
  });

  it('gives a custom 525-line timing 262 lines per frame', () => {
    // Arrange
    const input = { preset: ConsolePreset.Custom, standard: VideoStandard.Ntsc, custom: CUSTOM };

    // Act
    const timing = resolveTiming(input);

    // Assert
    expect(timing.linesPerFrame).toBe(262);
  });
});
