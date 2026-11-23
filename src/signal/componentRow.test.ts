import { describe, expect, it } from 'vitest';

import { componentRow } from './componentRow';

const FSC = 315e6 / 88;
const RATE = 16 * FSC;
const DOT_CLOCK_HZ = 6_711_647;
const PIXELS = 64;
const PLAN = {
  samplesPerCycle: 16,
  sampleRateHz: RATE,
  samplesPerPixel: RATE / DOT_CLOCK_HZ,
  width: Math.ceil(PIXELS * (RATE / DOT_CLOCK_HZ))
};

const stepRow = (left: readonly number[], right: readonly number[]): Float32Array =>
  Float32Array.from(
    Array.from({ length: PIXELS }, (_, index) => (index < PIXELS / 2 ? left : right)).flat()
  );

const crossing = (values: readonly number[], level: number): number => {
  const index = values.findIndex((value) => value >= level);
  const before = values[index - 1] ?? level;
  const after = values[index] ?? level;
  return index - 1 + (level - before) / (after - before || 1);
};

const riseSeconds = (values: readonly number[]): number => {
  const start = values[0] ?? 0;
  const span = (values.at(-1) ?? 0) - start;
  return (crossing(values, start + 0.9 * span) - crossing(values, start + 0.1 * span)) / RATE;
};

const lumaOf = (rgb: Float32Array, n: number): number =>
  0.299 * (rgb[n * 3] ?? 0) + 0.587 * (rgb[n * 3 + 1] ?? 0) + 0.114 * (rgb[n * 3 + 2] ?? 0);

describe('componentRow', () => {
  it('rises in 0.35 over the 5.75 MHz luma band and the 2.75 MHz colour band', () => {
    // Arrange
    const lumaEdge = stepRow([0, 0, 0], [1, 1, 1]);
    const colourEdge = stepRow([0.5, 0.5, 0.5], [0.8, 0.5 - (0.299 * 0.3) / 0.587, 0.5]);

    // Act
    const [luma = new Float32Array(0), colour = new Float32Array(0)] = [lumaEdge, colourEdge].map(
      (pixels) => componentRow({ pixels, plan: PLAN, saturation: 1 })
    );

    // Assert
    const lumaTrace = Array.from({ length: PLAN.width }, (_, n) => lumaOf(luma, n));
    const redDifference = Array.from(
      { length: PLAN.width },
      (_, n) => (colour[n * 3] ?? 0) - lumaOf(colour, n)
    );
    expect(riseSeconds(lumaTrace)).toBeGreaterThan((0.35 / 5.75e6) * 0.8);
    expect(riseSeconds(lumaTrace)).toBeLessThan((0.35 / 5.75e6) * 1.25);
    expect(riseSeconds(redDifference)).toBeGreaterThan((0.35 / 2.75e6) * 0.8);
    expect(riseSeconds(redDifference)).toBeLessThan((0.35 / 2.75e6) * 1.25);
  });
});
