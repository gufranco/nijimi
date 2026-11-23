import { describe, expect, it } from 'vitest';

import { createColorCounter } from './createColorCounter';
import type { RgbFrame } from './types';

const frameOf = (pixels: readonly (readonly [number, number, number])[]): RgbFrame => ({
  width: pixels.length,
  height: 1,
  data: Float32Array.from(pixels.flatMap((pixel) => pixel.map((value) => value / 255)))
});

describe('createColorCounter', () => {
  it('counts the colors used across every frame it is given, once each', () => {
    // Arrange
    const counter = createColorCounter();
    counter.add(
      frameOf([
        [0, 0, 0],
        [255, 0, 0]
      ])
    );
    counter.add(
      frameOf([
        [255, 0, 0],
        [0, 0, 255]
      ])
    );

    // Act
    const stats = counter.stats();

    // Assert
    expect(stats).toEqual({ colors: 3, levels: 2 });
  });

  it('clamps values outside 0 to 1 before counting', () => {
    // Arrange
    const counter = createColorCounter();
    counter.add({ width: 2, height: 1, data: Float32Array.from([-0.2, 1.3, 0, 0, 1, 0]) });

    // Act
    const stats = counter.stats();

    // Assert
    expect(stats).toEqual({ colors: 1, levels: 1 });
  });
});
