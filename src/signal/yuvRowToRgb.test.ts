import { describe, expect, it } from 'vitest';

import { yuvRowToRgb } from './yuvRowToRgb';

describe('yuvRowToRgb', () => {
  it('interleaves R, G and B for each sample', () => {
    // Arrange
    const row = {
      y: Float64Array.from([1, 0.299]),
      u: Float64Array.from([0, -0.14713]),
      v: Float64Array.from([0, 0.61499])
    };

    // Act
    const rgb = yuvRowToRgb(row, 1);

    // Assert
    expect(Array.from(rgb).map((value) => Math.round(value * 1000) / 1000 + 0)).toEqual([
      1, 1, 1, 1, 0, 0
    ]);
  });

  it('scales chroma by the saturation', () => {
    // Arrange
    const row = {
      y: Float64Array.from([0.299]),
      u: Float64Array.from([-0.14713]),
      v: Float64Array.from([0.61499])
    };

    // Act
    const rgb = yuvRowToRgb(row, 0);

    // Assert
    expect(Array.from(rgb).map((value) => Math.round(value * 1000) / 1000)).toEqual([
      0.299, 0.299, 0.299
    ]);
  });
});
