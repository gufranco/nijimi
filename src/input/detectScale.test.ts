import { describe, expect, it } from 'vitest';

import { detectScale } from './detectScale';
import type { RgbaImage } from './types';

const blocky = (nativeWidth: number, nativeHeight: number, scale: number): RgbaImage => {
  const width = nativeWidth * scale;
  const height = nativeHeight * scale;
  const data = Uint8ClampedArray.from({ length: width * height * 4 }, (_, index) => {
    const pixel = Math.floor(index / 4);
    const x = Math.floor((pixel % width) / scale);
    const y = Math.floor(Math.floor(pixel / width) / scale);
    return index % 4 === 3 ? 255 : (x * 37 + y * 91 + (index % 4) * 53) % 256;
  });
  return { width, height, data };
};

describe('detectScale', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])('recovers an integer scale of %d', (scale) => {
    // Arrange
    const image = blocky(8, 6, scale);

    // Act
    const detected = detectScale(image);

    // Assert
    expect(detected).toBe(scale);
  });

  it('keeps the file size when one block holds two colours', () => {
    // Arrange
    const image = blocky(8, 6, 4);
    const broken = {
      ...image,
      data: image.data.map((value, index) =>
        index === (1 * image.width + 1) * 4 ? (value + 1) % 256 : value
      )
    };

    // Act
    const detected = detectScale(broken);

    // Assert
    expect(detected).toBe(1);
  });

  it('keeps the file size when the size is not a multiple', () => {
    // Arrange
    const image = blocky(7, 5, 1);

    // Act
    const detected = detectScale(image);

    // Assert
    expect(detected).toBe(1);
  });
});
