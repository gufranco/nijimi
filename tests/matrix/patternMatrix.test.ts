import { describe, expect, it } from 'vitest';

import { Connection } from '../../src/signal/connection';
import { ConsolePreset } from '../../src/signal/consolePreset';
import { simulateSignal } from '../../src/signal/simulateSignal';
import { VideoStandard } from '../../src/signal/videoStandard';
import { DITHER_PATTERNS } from '../fixtures/ditherPatterns';
import { MEASURE } from '../fixtures/measure';
import { patternFrame } from '../fixtures/patternFrame';
import type { Rgb } from '../fixtures/patternFrame';
import { signalSettings } from '../fixtures/signalSettings';

const WIDTH = 64;
const HEIGHT = 8;
const TWO_TONE: readonly Rgb[] = [
  [0.75, 0.35, 0.25],
  [0.2, 0.3, 0.65]
];
const FOUR_TONE: readonly Rgb[] = [
  [0.1, 0.1, 0.2],
  [0.6, 0.2, 0.3],
  [0.3, 0.7, 0.4],
  [0.95, 0.9, 0.8]
];
const CONNECTIONS = Object.values(Connection);
const STANDARDS = Object.values(VideoStandard);
const PRESETS = Object.values(ConsolePreset);
const MEAN_TOLERANCE = 0.03;

const cells = DITHER_PATTERNS.flatMap((pattern) =>
  CONNECTIONS.flatMap((connection) =>
    STANDARDS.flatMap((standard) =>
      PRESETS.map((preset) => ({ pattern, connection, standard, preset }))
    )
  )
);

describe('every dither pattern through every connection, standard and console', () => {
  it('covers 24 patterns, 5 connections, 3 standards and 31 presets', () => {
    // Arrange
    const expected = 24 * 5 * 3 * 31;

    // Act
    const count = cells.length;

    // Assert
    expect(count).toBe(expected);
  });

  it.each(cells)('$pattern.id $pattern.name through $connection, $standard, $preset', (cell) => {
    // Arrange
    const frame = patternFrame({
      mask: cell.pattern.mask(WIDTH, HEIGHT),
      width: WIDTH,
      palette: cell.pattern.levels === 2 ? TWO_TONE : FOUR_TONE
    });
    const settings = signalSettings({
      connection: cell.connection,
      standard: cell.standard,
      preset: cell.preset
    });

    // Act
    const image = simulateSignal([frame], settings);

    // Assert
    expect(MEASURE.allFinite(image)).toBe(true);
    expect(Math.abs(MEASURE.meanImageLuma(image) - MEASURE.meanFrameLuma(frame))).toBeLessThan(
      MEAN_TOLERANCE
    );
  });
});
