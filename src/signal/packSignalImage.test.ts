import { describe, expect, it } from 'vitest';

import { packSignalImage } from './packSignalImage';
import type { SignalImage } from './types';

describe('packSignalImage', () => {
  it('maps -0.25 to 0, 1.25 to 255 and clips beyond them', () => {
    // Arrange
    const image: SignalImage = {
      width: 2,
      height: 1,
      sampleAspect: 0.5,
      frameCount: 1,
      data: Float32Array.from([-0.25, 0.5, 1.25, -1, 2, 0])
    };

    // Act
    const packed = packSignalImage(image);

    // Assert
    expect([...packed.data]).toEqual([0, 128, 255, 0, 255, 43]);
    expect([packed.width, packed.height, packed.sampleAspect, packed.frameCount]).toEqual([
      2, 1, 0.5, 1
    ]);
  });
});
