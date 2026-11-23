import { describe, expect, it } from 'vitest';

import { packSignalImage } from './packSignalImage';
import type { SignalImage } from './types';
import { unpackSignalImage } from './unpackSignalImage';

describe('unpackSignalImage', () => {
  it('restores every sample within half a step of 1.5/255', () => {
    // Arrange
    const values = [-0.2, 0, 0.123, 0.5, 0.987, 1.1];
    const packed = packSignalImage({
      width: 2,
      height: 1,
      sampleAspect: 1,
      frameCount: 1,
      data: Float32Array.from(values)
    });

    // Act
    const image: SignalImage = unpackSignalImage(packed);

    // Assert
    expect(
      [...image.data].every(
        (value, index) => Math.abs(value - (values[index] ?? 0)) <= 1.5 / 255 / 2 + 1e-6
      )
    ).toBe(true);
    expect([image.width, image.height]).toEqual([2, 1]);
  });
});
