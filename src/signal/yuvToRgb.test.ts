import { describe, expect, it } from 'vitest';

import { yuvToRgb } from './yuvToRgb';

describe('yuvToRgb', () => {
  it.each([
    [
      [1, 0, 0],
      [1, 1, 1]
    ],
    [
      [0.299, -0.14713, 0.61499],
      [1, 0, 0]
    ],
    [
      [0.5, 0, 0],
      [0.5, 0.5, 0.5]
    ]
  ])('converts the BT.601 Y, U, V %j to %j', (yuv, expected) => {
    // Arrange
    const [y, u, v] = yuv as [number, number, number];

    // Act
    const rgb = yuvToRgb(y, u, v);

    // Assert
    rgb.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index] ?? Number.NaN, 4);
    });
  });
});
