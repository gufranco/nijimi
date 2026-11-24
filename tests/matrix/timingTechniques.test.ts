import { describe, expect, it } from 'vitest';

import { Connection } from '../../src/signal/connection';
import { ConsolePreset } from '../../src/signal/consolePreset';
import { FrameView } from '../../src/signal/frameView';
import { PalDecoding } from '../../src/signal/palDecoding';
import { ScanMode } from '../../src/signal/scanMode';
import { simulateSignal } from '../../src/signal/simulateSignal';
import type { RgbFrame, SignalImage } from '../../src/signal/types';
import { VideoStandard } from '../../src/signal/videoStandard';
import { DITHER_PATTERNS } from '../fixtures/ditherPatterns';
import { MEASURE } from '../fixtures/measure';
import { patternFrame } from '../fixtures/patternFrame';
import type { Rgb } from '../fixtures/patternFrame';
import { signalSettings } from '../fixtures/signalSettings';

const flat = (rgb: Rgb, width: number, height: number): RgbFrame =>
  patternFrame({ mask: new Uint8Array(width * height), width, palette: [rgb] });

const split = (left: Rgb, right: Rgb, width: number, height: number): RgbFrame =>
  patternFrame({
    mask: Uint8Array.from({ length: width * height }, (_, index) =>
      index % width < width / 2 ? 0 : 1
    ),
    width,
    palette: [left, right]
  });

const GAMMA = 2.4;
const EMPTY: SignalImage = {
  width: 0,
  height: 0,
  data: new Float32Array(0),
  sampleAspect: 1,
  frameCount: 1
};

describe('C04 flicker transparency', () => {
  it('blends two alternating frames to their linear-light mean in the averaged view', () => {
    // Arrange
    const frames = [flat([0.9, 0.2, 0.1], 32, 4), flat([0.1, 0.3, 0.8], 32, 4)] as const;
    const expected = [0.9, 0.2, 0.1].map(
      (a, channel) => ((a ** GAMMA + ([0.1, 0.3, 0.8][channel] ?? 0) ** GAMMA) / 2) ** (1 / GAMMA)
    );

    // Act
    const image = simulateSignal(
      frames,
      signalSettings({ connection: Connection.Rgb, preset: ConsolePreset.GenesisH40 })
    );

    // Assert
    const centre = (2 * image.width + Math.floor(image.width / 2)) * 3;
    expected.forEach((value, channel) => {
      expect(image.data[centre + channel]).toBeCloseTo(value, 2);
    });
  });

  it('shows the second frame alone in the single-frame view', () => {
    // Arrange
    const frames = [flat([0.9, 0.2, 0.1], 32, 4), flat([0.1, 0.3, 0.8], 32, 4)] as const;

    // Act
    const image = simulateSignal(
      frames,
      signalSettings({ connection: Connection.Rgb, frameView: FrameView.Single, frameIndex: 1 })
    );

    // Assert
    const centre = (2 * image.width + Math.floor(image.width / 2)) * 3;
    expect(
      [image.data[centre], image.data[centre + 1], image.data[centre + 2]].map((value) =>
        Number(value?.toFixed(2))
      )
    ).toEqual([0.1, 0.3, 0.8]);
  });
});

describe('C05 dot crawl phase cycles at a colour edge', () => {
  const edgeLuma = (preset: ConsolePreset, rows: number): readonly number[] => {
    const frame = split([0.8, 0.2, 0.2], [0.2, 0.2, 0.8], 64, rows);
    const image = simulateSignal([frame], signalSettings({ preset, frameView: FrameView.Single }));
    const probe = Math.floor(image.width / 2) + 3;
    return Array.from(
      { length: rows },
      (_, row) => MEASURE.rowLuma(image, row)[probe] ?? Number.NaN
    );
  };

  it('repeats the NES pattern every 3 lines and changes it on every line', () => {
    // Arrange
    const rows = 7;

    // Act
    const luma = edgeLuma(ConsolePreset.Nes, rows);

    // Assert
    expect(Math.abs((luma[1] ?? 0) - (luma[4] ?? 0))).toBeLessThan(1e-5);
    expect(Math.abs((luma[1] ?? 0) - (luma[2] ?? 0))).toBeGreaterThan(1e-3);
  });

  it('holds the Genesis pattern still from line to line', () => {
    // Arrange
    const rows = 5;

    // Act
    const luma = edgeLuma(ConsolePreset.GenesisH40, rows);

    // Assert
    luma.forEach((value) => {
      expect(value).toBeCloseTo(luma[0] ?? Number.NaN, 5);
    });
  });

  it('flips a broadcast-timed 227.5-cycle line every other line', () => {
    // Arrange
    const rows = 5;

    // Act
    const luma = edgeLuma(ConsolePreset.Custom, rows);

    // Assert
    expect(Math.abs((luma[1] ?? 0) - (luma[3] ?? 0))).toBeLessThan(1e-5);
    expect(Math.abs((luma[1] ?? 0) - (luma[2] ?? 0))).toBeGreaterThan(1e-3);
  });
});

describe('C07 interlaced 480i', () => {
  const rowsFrame = (): RgbFrame => {
    const pattern = DITHER_PATTERNS.find((candidate) => candidate.id === 'P03');
    return patternFrame({
      mask: pattern?.mask(32, 8) ?? new Uint8Array(0),
      width: 32,
      palette: [
        [0.1, 0.1, 0.1],
        [0.9, 0.9, 0.9]
      ]
    });
  };

  it('lights only the current field in the single-frame view', () => {
    // Arrange
    const frame = rowsFrame();

    // Act
    const image = simulateSignal(
      [frame],
      signalSettings({
        connection: Connection.Rgb,
        scan: ScanMode.Interlaced,
        frameView: FrameView.Single,
        frameIndex: 1
      })
    );

    // Assert
    const middle = Math.floor(image.width / 2);
    expect(
      Array.from({ length: 8 }, (_, row) =>
        Number((MEASURE.rowLuma(image, row)[middle] ?? 0).toFixed(2))
      )
    ).toEqual([0, 0.1, 0, 0.1, 0, 0.1, 0, 0.1]);
  });

  it('shows both fields at full detail in the averaged view', () => {
    // Arrange
    const frame = rowsFrame();

    // Act
    const image = simulateSignal(
      [frame],
      signalSettings({ connection: Connection.Rgb, scan: ScanMode.Interlaced })
    );

    // Assert
    const middle = Math.floor(image.width / 2);
    expect(
      Array.from({ length: 4 }, (_, row) =>
        Number((MEASURE.rowLuma(image, row)[middle] ?? 0).toFixed(2))
      )
    ).toEqual([0.9, 0.1, 0.9, 0.1]);
  });
});

describe('C09 and C10 edge rise times on a PAL picture sampled four times per cycle', () => {
  const PAL_FSC = 4_433_618.75;
  const RATE = 4 * PAL_FSC;
  const custom = { dotClockHz: PAL_FSC, cyclesPerLine: 283.75 };
  const render = (connection: Connection, left: Rgb, right: Rgb): SignalImage =>
    simulateSignal(
      [split(left, right, 48, 3)],
      signalSettings({
        connection,
        standard: VideoStandard.PalBg,
        preset: ConsolePreset.Custom,
        custom
      })
    );

  it('rises luma in 0.35 over the 5 MHz PAL luma band on S-Video', () => {
    // Arrange
    const edge = [
      [0, 0, 0],
      [1, 1, 1]
    ] as const;

    // Act
    const image = render(Connection.SVideo, ...edge);

    // Assert
    const rise = MEASURE.riseSeconds(MEASURE.rowLuma(image, 1), RATE);
    expect(rise).toBeGreaterThan((0.35 / 5e6) * 0.75);
    expect(rise).toBeLessThan((0.35 / 5e6) * 1.35);
  });

  it('smears a red edge over two cascaded 1.56 MHz chroma filters on S-Video', () => {
    // Arrange
    const edge = [
      [0, 0, 0],
      [0.8, 0, 0]
    ] as const;

    // Act
    const image = render(Connection.SVideo, ...edge);

    // Assert
    const rise = MEASURE.riseSeconds(MEASURE.rowRedDifference(image, 1), RATE);
    expect(rise).toBeGreaterThan(((Math.SQRT2 * 0.35) / 1.56e6) * 0.8);
    expect(rise).toBeLessThan(((Math.SQRT2 * 0.35) / 1.56e6) * 1.2);
  });

  it('smears red at least as far on composite as on S-Video', () => {
    // Arrange
    const edge = [
      [0, 0, 0],
      [0.8, 0, 0]
    ] as const;

    // Act
    const [svideo, composite] = [Connection.SVideo, Connection.Composite].map((connection) =>
      render(connection, ...edge)
    );

    // Assert
    const rises = [svideo, composite].map((image) =>
      image === undefined ? 0 : MEASURE.riseSeconds(MEASURE.rowRedDifference(image, 1), RATE)
    );
    expect(rises[1]).toBeGreaterThanOrEqual((rises[0] ?? 0) * 0.95);
  });
});

describe('C19 component colour at the BT.601 half band', () => {
  const PAL_FSC = 4_433_618.75;
  const RATE = 4 * PAL_FSC;
  const custom = { dotClockHz: PAL_FSC, cyclesPerLine: 283.75 };

  it('changes colour about twice as slowly as brightness, each at its BT.601 band, at a red edge', () => {
    // Arrange
    const settings = signalSettings({
      connection: Connection.Component,
      standard: VideoStandard.PalBg,
      preset: ConsolePreset.Custom,
      custom
    });

    // Act
    const image = simulateSignal([split([0, 0, 0], [0.8, 0, 0], 48, 3)], settings);

    // Assert
    const lumaRise = MEASURE.riseSeconds(MEASURE.rowLuma(image, 1), RATE);
    const chromaRise = MEASURE.riseSeconds(MEASURE.rowRedDifference(image, 1), RATE);
    expect(lumaRise).toBeGreaterThan((0.35 / 5.75e6) * 0.85);
    expect(lumaRise).toBeLessThan((0.35 / 5.75e6) * 1.15);
    expect(chromaRise).toBeGreaterThan((0.35 / 2.75e6) * 0.9);
    expect(chromaRise).toBeLessThan((0.35 / 2.75e6) * 1.15);
    expect(chromaRise / lumaRise).toBeGreaterThan(1.8);
  });
});

describe('C11 pixel aspect ratio per console', () => {
  it.each([
    [ConsolePreset.Nes, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.Snes256, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.Snes512, VideoStandard.Ntsc, 512, 4 / 7],
    [ConsolePreset.GenesisH32, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.GenesisH40, VideoStandard.Ntsc, 320, 32 / 35],
    [ConsolePreset.MasterSystem, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.Ps1W256, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.Ps1W320, VideoStandard.Ntsc, 320, 32 / 35],
    [ConsolePreset.Ps1W368, VideoStandard.Ntsc, 368, 4 / 5],
    [ConsolePreset.Ps1W512, VideoStandard.Ntsc, 512, 4 / 7],
    [ConsolePreset.Ps1W640, VideoStandard.Ntsc, 640, 16 / 35],
    [ConsolePreset.Sg1000, VideoStandard.Ntsc, 256, 8 / 7],
    [ConsolePreset.Sega32x, VideoStandard.Ntsc, 320, 32 / 35],
    [ConsolePreset.Atari2600, VideoStandard.Ntsc, 160, 12 / 7],
    [ConsolePreset.Atari7800W160, VideoStandard.Ntsc, 160, 12 / 7],
    [ConsolePreset.Atari7800W320, VideoStandard.Ntsc, 320, 6 / 7],
    [ConsolePreset.Atari5200W160, VideoStandard.Ntsc, 160, 12 / 7],
    [ConsolePreset.Atari5200W320, VideoStandard.Ntsc, 320, 6 / 7],
    [ConsolePreset.N64W320, VideoStandard.Ntsc, 320, 120 / 119],
    [ConsolePreset.SaturnW320, VideoStandard.Ntsc, 320, 32 / 35],
    [ConsolePreset.SaturnW352, VideoStandard.Ntsc, 352, 6 / 7],
    [ConsolePreset.GameBoy, VideoStandard.Ntsc, 160, 1],
    [ConsolePreset.GameGear, VideoStandard.PalBg, 160, 1],
    [ConsolePreset.JaguarW320, VideoStandard.Ntsc, 320, 12 / 13],
    [ConsolePreset.Nes, VideoStandard.PalBg, 256, 2_950_000 / 2_128_137]
  ])(
    'gives %s on %s a pixel aspect ratio of %d wide pixels at %f',
    (preset, standard, pixels, expected) => {
      // Arrange
      const frame = flat([0.5, 0.5, 0.5], pixels, 2);

      // Act
      const image = simulateSignal(
        [frame],
        signalSettings({ connection: Connection.Rgb, preset, standard })
      );

      // Assert
      expect((image.sampleAspect * image.width) / pixels).toBeCloseTo(expected, 2);
    }
  );
});

describe('C14 PAL phase alternation', () => {
  it.each([VideoStandard.PalBg, VideoStandard.PalM])(
    'shows Hanover bars on %s with a simple decoder',
    (standard) => {
      // Arrange
      const frame = flat([0.7, 0.4, 0.2], 32, 4);

      // Act
      const image = simulateSignal(
        [frame],
        signalSettings({ standard, hueDegrees: 10, connection: Connection.SVideo })
      );

      // Assert
      const hues = [1, 2].map((row) => MEASURE.hueDegrees(image, row));
      expect(Math.abs((hues[0] ?? 0) - (hues[1] ?? 0))).toBeGreaterThan(15);
    }
  );

  it.each([VideoStandard.PalBg, VideoStandard.PalM])(
    'cancels the hue error on %s with the delay line',
    (standard) => {
      // Arrange
      const frame = flat([0.7, 0.4, 0.2], 32, 4);
      const reference = simulateSignal(
        [frame],
        signalSettings({
          standard,
          connection: Connection.SVideo,
          palDecoding: PalDecoding.DelayLine
        })
      );

      // Act
      const image = simulateSignal(
        [frame],
        signalSettings({
          standard,
          hueDegrees: 10,
          connection: Connection.SVideo,
          palDecoding: PalDecoding.DelayLine
        })
      );

      // Assert
      expect(
        Math.abs(MEASURE.hueDegrees(image, 2) - MEASURE.hueDegrees(reference, 2))
      ).toBeLessThan(1);
    }
  );

  it('rotates every NTSC line by the full hue error', () => {
    // Arrange
    const frame = flat([0.7, 0.4, 0.2], 32, 4);
    const reference = simulateSignal([frame], signalSettings({ connection: Connection.SVideo }));

    // Act
    const image = simulateSignal(
      [frame],
      signalSettings({ hueDegrees: 10, connection: Connection.SVideo })
    );

    // Assert
    expect(
      Math.abs(Math.abs(MEASURE.hueDegrees(image, 2) - MEASURE.hueDegrees(reference, 2)) - 10)
    ).toBeLessThan(1);
  });
});

describe('C15 RF artifacts', () => {
  it('matches composite on a flat field with every artifact off', () => {
    // Arrange
    const frame = flat([0.6, 0.5, 0.3], 32, 3);

    // Act
    const [rf, composite] = [Connection.Rf, Connection.Composite].map((connection) =>
      simulateSignal([frame], signalSettings({ connection }))
    );

    // Assert
    const centre = ((rf?.width ?? 0) + Math.floor((rf?.width ?? 0) / 2)) * 3;
    expect(rf?.data[centre]).toBeCloseTo(composite?.data[centre] ?? Number.NaN, 4);
  });

  it('adds the sound beat as a luma ripple on a flat field', () => {
    // Arrange
    const frame = flat([0.5, 0.5, 0.5], 64, 3);

    // Act
    const image = simulateSignal(
      [frame],
      signalSettings({ connection: Connection.Rf, rf: { noise: 0, ghost: 0, beat: 1 } })
    );

    // Assert
    expect(MEASURE.centreContrast(MEASURE.rowLuma(image, 1))).toBeGreaterThan(0.05);
  });

  it('echoes a bright bar 1.5 microseconds to the right at about 35 percent with the ghost', () => {
    // Arrange
    const frame = split([1, 1, 1], [0, 0, 0], 64, 3);
    const rate = 4 * (315e6 / 88);

    // Act
    const [clean = EMPTY, ghosted = EMPTY] = [0, 1].map((ghost) =>
      simulateSignal(
        [frame],
        signalSettings({ connection: Connection.Rf, rf: { noise: 0, ghost, beat: 0 } })
      )
    );

    // Assert
    const probe = Math.round(clean.width / 2 + 0.75e-6 * rate);
    const far = Math.round(clean.width / 2 + 3e-6 * rate);
    const lift = (row: SignalImage, at: number): number => MEASURE.rowLuma(row, 1)[at] ?? 0;
    expect(lift(ghosted, probe) - lift(clean, probe)).toBeGreaterThan(0.25);
    expect(lift(ghosted, probe) - lift(clean, probe)).toBeLessThan(0.45);
    expect(Math.abs(lift(ghosted, far) - lift(clean, far))).toBeLessThan(0.05);
  });

  it('roughens a flat field with seeded noise, the same way twice', () => {
    // Arrange
    const frame = flat([0.5, 0.5, 0.5], 64, 3);
    const settings = signalSettings({
      connection: Connection.Rf,
      rf: { noise: 1, ghost: 0, beat: 0 }
    });

    // Act
    const [first = EMPTY, second = EMPTY] = [0, 1].map(() => simulateSignal([frame], settings));

    // Assert
    expect(MEASURE.centreContrast(MEASURE.rowLuma(first, 1))).toBeGreaterThan(0.05);
    expect(Array.from(first.data)).toEqual(Array.from(second.data));
  });
});

describe('C20 flat colours round-trip through every connection', () => {
  it.each(Object.values(Connection))(
    'keeps a flat colour within 0.01 per channel through %s',
    (connection) => {
      // Arrange
      const frame = flat([0.7, 0.45, 0.25], 32, 3);

      // Act
      const image = simulateSignal([frame], signalSettings({ connection }));

      // Assert
      const centre = (image.width + Math.floor(image.width / 2)) * 3;
      [0.7, 0.45, 0.25].forEach((value, channel) => {
        expect(Math.abs((image.data[centre + channel] ?? 0) - value)).toBeLessThan(0.01);
      });
    }
  );
});
