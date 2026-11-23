import { describe, expect, it } from 'vitest';

import { CheckOutcome } from './checkOutcome';
import { checkImage } from './checkImage';
import { ConsolePreset } from './consolePreset';
import { SpecialMode } from './specialMode';
import { VideoStandard } from './videoStandard';

const input = (
  overrides: Partial<Parameters<typeof checkImage>[0]> = {}
): Parameters<typeof checkImage>[0] => ({
  width: 320,
  height: 224,
  stats: { colors: 40, levels: 6 },
  preset: ConsolePreset.GenesisH40,
  standard: VideoStandard.Ntsc,
  ...overrides
});

describe('checkImage', () => {
  it('passes a 320x224 Genesis H40 picture with 40 colors on 6 levels', () => {
    // Arrange
    const picture = input();

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report).toEqual({
      resolution: {
        outcome: CheckOutcome.Pass,
        width: 320,
        height: 224,
        needs: [],
        fitting: [
          ConsolePreset.GenesisH40,
          ConsolePreset.Ps1W320,
          ConsolePreset.Sega32x,
          ConsolePreset.Atari7800W320,
          ConsolePreset.Atari5200W320,
          ConsolePreset.N64W320,
          ConsolePreset.SaturnW320,
          ConsolePreset.JaguarW320
        ]
      },
      colors: { outcome: CheckOutcome.Pass, found: 40, limit: 61, needs: null },
      levels: { outcome: CheckOutcome.Pass, found: 6, limit: 8, needs: null }
    });
  });

  it('asks for shadow/highlight beyond 61 colors and fails beyond 183', () => {
    // Arrange
    const pictures = [100, 200].map((colors) => input({ stats: { colors, levels: 8 } }));

    // Act
    const reports = pictures.map(checkImage);

    // Assert
    expect(reports.map((report) => report?.colors)).toEqual([
      {
        outcome: CheckOutcome.NeedsMode,
        found: 100,
        limit: 183,
        needs: SpecialMode.ShadowHighlight
      },
      { outcome: CheckOutcome.Fail, found: 200, limit: 183, needs: null }
    ]);
  });

  it('accepts 240 lines on PAL only through V30 and fails them on NTSC', () => {
    // Arrange
    const pictures = [VideoStandard.PalBg, VideoStandard.Ntsc].map((standard) =>
      input({ height: 240, standard })
    );

    // Act
    const reports = pictures.map(checkImage);

    // Assert
    expect(reports.map((report) => [report?.resolution.outcome, report?.resolution.needs])).toEqual(
      [
        [CheckOutcome.NeedsMode, [SpecialMode.PalV30]],
        [CheckOutcome.Fail, []]
      ]
    );
  });

  it('treats PAL-M as a 525-line standard', () => {
    // Arrange
    const picture = input({ height: 240, standard: VideoStandard.PalM });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report?.resolution.outcome).toBe(CheckOutcome.Fail);
  });

  it('fails a width the preset does not draw and names the presets that do', () => {
    // Arrange
    const picture = input({ width: 256, height: 224 });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report?.resolution).toEqual({
      outcome: CheckOutcome.Fail,
      width: 256,
      height: 224,
      needs: [],
      fitting: [
        ConsolePreset.Nes,
        ConsolePreset.Snes256,
        ConsolePreset.GenesisH32,
        ConsolePreset.MasterSystem,
        ConsolePreset.Ps1W256,
        ConsolePreset.Atari5200W320,
        ConsolePreset.JaguarW256
      ]
    });
  });

  it('skips the channel check on the NES, whose palette has no fixed RGB values', () => {
    // Arrange
    const picture = input({
      width: 256,
      height: 240,
      preset: ConsolePreset.Nes,
      stats: { colors: 20, levels: 99 }
    });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report?.levels).toEqual({
      outcome: CheckOutcome.NotApplicable,
      found: 99,
      limit: 0,
      needs: null
    });
  });

  it('accepts any PlayStation height up to 240 and needs interlace above it', () => {
    // Arrange
    const pictures = [200, 400, 481].map((height) =>
      input({ width: 320, height, preset: ConsolePreset.Ps1W320 })
    );

    // Act
    const outcomes = pictures.map((picture) => checkImage(picture)?.resolution.outcome);

    // Assert
    expect(outcomes).toEqual([CheckOutcome.Pass, CheckOutcome.NeedsMode, CheckOutcome.Fail]);
  });

  it('checks nothing for custom timing', () => {
    // Arrange
    const picture = input({ preset: ConsolePreset.Custom });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report).toBeNull();
  });

  it('accepts a 240-wide SG-1000 picture only in text mode', () => {
    // Arrange
    const picture = input({
      width: 240,
      height: 192,
      preset: ConsolePreset.Sg1000,
      stats: { colors: 2, levels: 2 }
    });

    // Act
    const report = checkImage(picture);

    // Assert
    expect([report?.resolution.outcome, report?.resolution.needs]).toEqual([
      CheckOutcome.NeedsMode,
      [SpecialMode.TextMode]
    ]);
  });

  it('asks for direct color above 256 colors on the 32X', () => {
    // Arrange
    const picture = input({ preset: ConsolePreset.Sega32x, stats: { colors: 300, levels: 20 } });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report?.colors).toEqual({
      outcome: CheckOutcome.NeedsMode,
      found: 300,
      limit: 32_768,
      needs: SpecialMode.DirectColor32x
    });
  });

  it('passes 192 lines on the Atari 2600 and needs a custom kernel for 200', () => {
    // Arrange
    const pictures = [192, 200].map((height) =>
      input({
        width: 160,
        height,
        preset: ConsolePreset.Atari2600,
        stats: { colors: 4, levels: 4 }
      })
    );

    // Act
    const reports = pictures.map(checkImage);

    // Assert
    expect(reports.map((report) => [report?.resolution.outcome, report?.resolution.needs])).toEqual(
      [
        [CheckOutcome.Pass, []],
        [CheckOutcome.NeedsMode, [SpecialMode.CustomLineCount]]
      ]
    );
  });

  it('limits Atari 2600 colors to the 128 NTSC and 104 PAL palette entries', () => {
    // Arrange
    const pictures = [VideoStandard.Ntsc, VideoStandard.PalBg].map((standard) =>
      input({
        width: 160,
        height: 192,
        preset: ConsolePreset.Atari2600,
        standard,
        stats: { colors: 110, levels: 9 }
      })
    );

    // Act
    const reports = pictures.map(checkImage);

    // Assert
    expect(reports.map((report) => [report?.colors.outcome, report?.colors.limit])).toEqual([
      [CheckOutcome.NeedsMode, 128],
      [CheckOutcome.Fail, 104]
    ]);
  });

  it('steps Atari 5200 colors from 9 registers to 128 with per-line changes and 256 in the GTIA mode', () => {
    // Arrange
    const pictures = [9, 100, 200].map((colors) =>
      input({
        width: 160,
        height: 192,
        preset: ConsolePreset.Atari5200W160,
        stats: { colors, levels: 9 }
      })
    );

    // Act
    const reports = pictures.map(checkImage);

    // Assert
    expect(reports.map((report) => [report?.colors.outcome, report?.colors.needs])).toEqual([
      [CheckOutcome.Pass, null],
      [CheckOutcome.NeedsMode, SpecialMode.PerLineColors],
      [CheckOutcome.NeedsMode, SpecialMode.GtiaLuminanceMode]
    ]);
  });

  it('needs a 32-bit frame buffer on the N64 above 32 levels per channel', () => {
    // Arrange
    const picture = input({
      width: 320,
      height: 240,
      preset: ConsolePreset.N64W320,
      stats: { colors: 500, levels: 64 }
    });

    // Act
    const report = checkImage(picture);

    // Assert
    expect(report?.levels).toEqual({
      outcome: CheckOutcome.NeedsMode,
      found: 64,
      limit: 256,
      needs: SpecialMode.Framebuffer32Bit
    });
  });

  it('accepts 256 lines on a PAL Saturn and fails them on NTSC', () => {
    // Arrange
    const pictures = [VideoStandard.PalBg, VideoStandard.Ntsc].map((standard) =>
      input({
        width: 320,
        height: 256,
        preset: ConsolePreset.SaturnW320,
        standard,
        stats: { colors: 100, levels: 20 }
      })
    );

    // Act
    const outcomes = pictures.map((picture) => checkImage(picture)?.resolution.outcome);

    // Assert
    expect(outcomes).toEqual([CheckOutcome.Pass, CheckOutcome.Fail]);
  });
});
