import { describe, expect, it } from 'vitest';

import { colorStats } from './colorStats';
import type { RgbFrame } from './types';

const frameOf = (pixels: readonly (readonly [number, number, number])[]): RgbFrame => ({
  width: pixels.length,
  height: 1,
  data: Float32Array.from(pixels.flatMap((pixel) => pixel.map((value) => value / 255)))
});

describe('colorStats', () => {
  it('counts distinct colors and the most distinct levels any one channel uses', () => {
    // Arrange
    const frame = frameOf([
      [0, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [85, 170, 0],
      [170, 85, 255]
    ]);

    // Act
    const stats = colorStats(frame);

    // Assert
    expect(stats).toEqual({ colors: 4, levels: 4 });
  });

  it('rounds each channel to the nearest 8-bit level before counting', () => {
    // Arrange
    const frame: RgbFrame = {
      width: 2,
      height: 1,
      data: Float32Array.from([0.2, 0.2, 0.2, 0.2005, 0.1985, 0.2])
    };

    // Act
    const stats = colorStats(frame);

    // Assert
    expect(stats).toEqual({ colors: 1, levels: 1 });
  });
});
