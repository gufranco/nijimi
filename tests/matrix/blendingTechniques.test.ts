import { describe, expect, it } from 'vitest';

import { Connection } from '../../src/signal/connection';
import { ConsolePreset } from '../../src/signal/consolePreset';
import { Separation } from '../../src/signal/separation';
import { simulateSignal } from '../../src/signal/simulateSignal';
import { DITHER_PATTERNS } from '../fixtures/ditherPatterns';
import { MEASURE } from '../fixtures/measure';
import { patternFrame } from '../fixtures/patternFrame';
import type { Rgb } from '../fixtures/patternFrame';
import { signalSettings } from '../fixtures/signalSettings';
import type { RgbFrame } from '../../src/signal/types';

const WIDTH = 64;
const HEIGHT = 6;
const WATERFALL: readonly Rgb[] = [
  [0.2, 0.4, 0.9],
  [0.95, 0.95, 1]
];
const BLACK_WHITE: readonly Rgb[] = [
  [0, 0, 0],
  [1, 1, 1]
];

const frameOf = (id: string, palette: readonly Rgb[], width = WIDTH): RgbFrame => {
  const pattern = DITHER_PATTERNS.find((candidate) => candidate.id === id);
  return patternFrame({ mask: pattern?.mask(width, HEIGHT) ?? new Uint8Array(0), width, palette });
};

const lumaSpan = (palette: readonly Rgb[]): number => {
  const lumas = palette.map(([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b);
  return Math.max(...lumas) - Math.min(...lumas);
};

describe('C01 column dither blends into a solid colour on composite, Genesis waterfalls', () => {
  it.each([
    [Connection.Composite, 0, 0.2],
    [Connection.Rf, 0, 0.2],
    [Connection.SVideo, 0.5, 1.1],
    [Connection.Component, 0.9, 1.1],
    [Connection.Rgb, 0.9, 1.1]
  ])(
    'keeps a %s column contrast between %d and %d of the input at Genesis H40',
    (connection, low, high) => {
      // Arrange
      const frame = frameOf('P02', WATERFALL);

      // Act
      const image = simulateSignal(
        [frame],
        signalSettings({ connection, preset: ConsolePreset.GenesisH40 })
      );

      // Assert
      const contrast = MEASURE.centreContrast(MEASURE.rowLuma(image, 2)) / lumaSpan(WATERFALL);
      expect(contrast).toBeGreaterThanOrEqual(low);
      expect(contrast).toBeLessThanOrEqual(high);
    }
  );
});

describe('C02 artifact colour from luma stripes near the subcarrier', () => {
  it.each([
    [Connection.Composite, 0.05, 1],
    [Connection.Rf, 0.05, 1],
    [Connection.SVideo, 0, 0.01],
    [Connection.Component, 0, 0.01],
    [Connection.Rgb, 0, 0.01]
  ])(
    'gives black and white Genesis H40 columns on %s a chroma level between %d and %d',
    (connection, low, high) => {
      // Arrange
      const frame = frameOf('P02', BLACK_WHITE);

      // Act
      const image = simulateSignal(
        [frame],
        signalSettings({ connection, preset: ConsolePreset.GenesisH40 })
      );

      // Assert
      const level = MEASURE.meanChromaMagnitude(image, 2);
      expect(level).toBeGreaterThanOrEqual(low);
      expect(level).toBeLessThanOrEqual(high);
    }
  );
});

describe('C03 checkerboard shadows and transparency', () => {
  it('flattens a checkerboard on composite in both directions', () => {
    // Arrange
    const frame = frameOf('P01', BLACK_WHITE);

    // Act
    const image = simulateSignal([frame], signalSettings({ connection: Connection.Composite }));

    // Assert
    const rows = [2, 3].map((row) => MEASURE.rowLuma(image, row));
    expect(MEASURE.centreContrast(rows[0] ?? [])).toBeLessThan(0.25);
    expect(Math.abs((rows[0]?.[60] ?? 0) - (rows[1]?.[60] ?? 0))).toBeLessThan(0.25);
  });

  it('keeps a checkerboard sharp on RGB', () => {
    // Arrange
    const frame = frameOf('P01', BLACK_WHITE);

    // Act
    const image = simulateSignal([frame], signalSettings({ connection: Connection.Rgb }));

    // Assert
    expect(MEASURE.centreContrast(MEASURE.rowLuma(image, 2))).toBeGreaterThan(0.9);
  });

  it.each(
    Object.values(Connection).flatMap((connection) =>
      Object.values(Separation).map((separation) => [connection, separation] as const)
    )
  )(
    'keeps 1-pixel horizontal rows apart through %s with a %s decoder',
    (connection, separation) => {
      // Arrange
      const frame = frameOf('P03', BLACK_WHITE);

      // Act
      const image = simulateSignal([frame], signalSettings({ connection, separation }));

      // Assert
      const [even, odd] = [2, 3].map(
        (row) => MEASURE.rowLuma(image, row)[Math.floor(image.width / 2)] ?? 0
      );
      expect(Math.abs((even ?? 0) - (odd ?? 0))).toBeGreaterThan(0.9);
    }
  );
});

describe('C06 SNES pseudo hi-res 512 blending', () => {
  const SQUARE_WAVE_FUNDAMENTAL = 4 / Math.PI;
  const NOTCH_AT_1_5_FSC = (1.25 / Math.hypot(1.25, 1.5)) ** 2;
  const LUMA_AT_5_37_MHZ = 1 / (1 + (5.37 / (4.2 / 0.802)) ** 4);
  const HOLD_AT_5_37_MHZ = Math.sin(Math.PI * 0.1875) / (Math.PI * 0.1875);
  const PREDICTED =
    SQUARE_WAVE_FUNDAMENTAL * NOTCH_AT_1_5_FSC * LUMA_AT_5_37_MHZ * HOLD_AT_5_37_MHZ;

  it('keeps 512-mode columns on composite within 30 percent of the predicted residual and under half of RGB', () => {
    // Arrange
    const frame = frameOf('P02', BLACK_WHITE, 128);

    // Act
    const [composite, rgb] = [Connection.Composite, Connection.Rgb].map((connection) =>
      MEASURE.centreContrast(
        MEASURE.rowLuma(
          simulateSignal([frame], signalSettings({ connection, preset: ConsolePreset.Snes512 })),
          2
        )
      )
    );

    // Assert
    expect(composite).toBeGreaterThan(PREDICTED * 0.7);
    expect(composite).toBeLessThan(PREDICTED * 1.3);
    expect(composite ?? 1).toBeLessThan((rgb ?? 0) / 2);
  });

  it('keeps 512-mode columns on RGB above half contrast', () => {
    // Arrange
    const frame = frameOf('P02', BLACK_WHITE, 128);

    // Act
    const image = simulateSignal(
      [frame],
      signalSettings({ connection: Connection.Rgb, preset: ConsolePreset.Snes512 })
    );

    // Assert
    expect(MEASURE.centreContrast(MEASURE.rowLuma(image, 2))).toBeGreaterThan(0.5);
  });
});

describe('C13 notch against comb separation', () => {
  it.each([Separation.Comb1, Separation.Comb2])(
    'cuts cross-colour of vertical stripes by at least half with %s',
    (separation) => {
      // Arrange
      const frame = frameOf('P02', BLACK_WHITE);
      const base = { connection: Connection.Composite, preset: ConsolePreset.Custom };

      // Act
      const [notched, combed] = [Separation.Notch, separation].map((mode) =>
        simulateSignal([frame], signalSettings({ ...base, separation: mode }))
      );

      // Assert
      const notchLevel = notched === undefined ? 0 : MEASURE.meanChromaMagnitude(notched, 3);
      const combLevel = combed === undefined ? 1 : MEASURE.meanChromaMagnitude(combed, 3);
      expect(notchLevel).toBeGreaterThan(0.05);
      expect(combLevel).toBeLessThan(notchLevel / 2);
    }
  );

  it('loses the colour of a Genesis picture whose lines all share one phase through a comb', () => {
    // Arrange
    const frame = frameOf('P24', [
      [0.8, 0.3, 0.2],
      [0.8, 0.3, 0.2]
    ]);
    const base = { connection: Connection.Composite, preset: ConsolePreset.GenesisH40 };

    // Act
    const [notched, combed] = [Separation.Notch, Separation.Comb2].map((separation) =>
      simulateSignal([frame], signalSettings({ ...base, separation }))
    );

    // Assert
    const notchLevel = notched === undefined ? 0 : MEASURE.meanChromaMagnitude(notched, 3);
    const combLevel = combed === undefined ? 1 : MEASURE.meanChromaMagnitude(combed, 3);
    expect(notchLevel).toBeGreaterThan(0.2);
    expect(combLevel).toBeLessThan(0.05);
  });
});
