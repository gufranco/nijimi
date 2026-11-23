import { describe, expect, it } from 'vitest';

import { chooseScale } from './chooseScale';
import type { RgbaImage } from './types';

const blocks = (width: number, height: number, block: number): RgbaImage => ({
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, index) => {
    const pixel = Math.floor(index / 4);
    const x = Math.floor((pixel % width) / block);
    const y = Math.floor(Math.floor(pixel / width) / block);
    return index % 4 === 3 ? 255 : ((x + y) % 2) * 255;
  })
});

describe('chooseScale', () => {
  it('uses the detected scale when there is no override', () => {
    // Arrange
    const image = blocks(8, 8, 2);

    // Act
    const choice = chooseScale(image, 0);

    // Assert
    expect(choice).toEqual({ scale: 2, detected: 2 });
  });

  it('uses an override that divides both sides', () => {
    // Arrange
    const image = blocks(8, 8, 2);

    // Act
    const choice = chooseScale(image, 4);

    // Assert
    expect(choice).toEqual({ scale: 4, detected: 2 });
  });

  it('ignores an override that does not divide both sides', () => {
    // Arrange
    const image = blocks(8, 6, 2);

    // Act
    const choice = chooseScale(image, 4);

    // Assert
    expect(choice).toEqual({ scale: 2, detected: 2 });
  });
});
