import { describe, expect, it } from 'vitest';

import { pixelsToYuv } from './pixelsToYuv';

describe('pixelsToYuv', () => {
  it('splits an interleaved RGB row into Y, U and V planes', () => {
    // Arrange
    const pixels = Float32Array.from([1, 1, 1, 1, 0, 0]);

    // Act
    const row = pixelsToYuv(pixels);

    // Assert
    expect(Array.from(row.y).map((value) => Number(value.toFixed(4)))).toEqual([1, 0.299]);
    expect(Array.from(row.u).map((value) => Number(value.toFixed(4)))).toEqual([0, -0.1474]);
    expect(Array.from(row.v).map((value) => Number(value.toFixed(4)))).toEqual([0, 0.6148]);
  });
});
