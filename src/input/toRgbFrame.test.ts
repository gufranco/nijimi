import { describe, expect, it } from 'vitest';

import { toRgbFrame } from './toRgbFrame';

describe('toRgbFrame', () => {
  it('samples one pixel per block and normalises to 0..1', () => {
    // Arrange
    const image = {
      width: 4,
      height: 2,
      data: Uint8ClampedArray.from([
        255, 0, 0, 255, 255, 0, 0, 255, 0, 0, 255, 255, 0, 0, 255, 255, 255, 0, 0, 255, 255, 0, 0,
        255, 0, 0, 255, 255, 0, 0, 255, 255
      ])
    };

    // Act
    const frame = toRgbFrame(image, 2);

    // Assert
    expect(frame.width).toBe(2);
    expect(frame.height).toBe(1);
    expect(Array.from(frame.data)).toEqual([1, 0, 0, 0, 0, 1]);
  });

  it('composites transparent pixels over black', () => {
    // Arrange
    const image = { width: 1, height: 1, data: Uint8ClampedArray.from([255, 255, 255, 51]) };

    // Act
    const frame = toRgbFrame(image, 1);

    // Assert
    expect(Array.from(frame.data).map((value) => Number(value.toFixed(3)))).toEqual([
      0.2, 0.2, 0.2
    ]);
  });
});
