import { describe, expect, it } from 'vitest';

import { rgbRow } from './rgbRow';

const FSC = 315e6 / 88;

describe('rgbRow', () => {
  it('keeps 1-pixel columns apart at the Genesis H40 dot clock', () => {
    // Arrange
    const pixels = Float32Array.from(
      Array.from({ length: 64 }, (_, index) => (index % 2 === 0 ? [1, 0, 0] : [0, 0, 1])).flat()
    );
    const plan = {
      samplesPerCycle: 4,
      sampleRateHz: 4 * FSC,
      samplesPerPixel: (4 * FSC) / 6_711_647,
      width: 137
    };

    // Act
    const samples = rgbRow({ pixels, plan, bandwidthHz: 5.75e6 });

    // Assert
    expect(samples).toHaveLength(137 * 3);
    const red = Array.from({ length: 137 }, (_, n) => samples[n * 3] ?? 0);
    expect(Math.max(...red.slice(40, 90)) - Math.min(...red.slice(40, 90))).toBeGreaterThan(0.6);
  });
});
