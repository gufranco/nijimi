import { describe, expect, it } from 'vitest';

import { nativeRgba } from './nativeRgba';

describe('nativeRgba', () => {
  it('keeps the top-left pixel of every scale block', () => {
    // Arrange
    const image = {
      width: 4,
      height: 2,
      data: Uint8ClampedArray.from([
        1, 2, 3, 255, 9, 9, 9, 9, 4, 5, 6, 128, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9,
        9, 9, 9
      ])
    };

    // Act
    const native = nativeRgba(image, 2);

    // Assert
    expect([native.width, native.height, ...native.data]).toEqual([
      2, 1, 1, 2, 3, 255, 4, 5, 6, 128
    ]);
  });
});
