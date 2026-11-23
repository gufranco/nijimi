import { describe, expect, it } from 'vitest';

import { renderSource } from './renderSource';

describe('renderSource', () => {
  it('draws the original pixels with nearest-neighbour scaling at the CRT size', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    const frame = { width: 2, height: 1, data: Float32Array.from([1, 0, 0, 0, 0, 1]) };

    // Act
    renderSource({ canvas, frame, geometry: { width: 40, height: 10, crop: 0 } });

    // Assert
    const context = canvas.getContext('2d');
    expect([canvas.width, canvas.height]).toEqual([40, 10]);
    expect(Array.from(context?.getImageData(19, 5, 1, 1).data ?? [])).toEqual([255, 0, 0, 255]);
    expect(Array.from(context?.getImageData(20, 5, 1, 1).data ?? [])).toEqual([0, 0, 255, 255]);
  });

  it('crops the original the same way as the CRT overscan', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    const frame = {
      width: 20,
      height: 2,
      data: Float32Array.from({ length: 120 }, (_, index) =>
        Math.floor(index / 3) % 20 === 0 ? 1 : 0
      )
    };

    // Act
    renderSource({ canvas, frame, geometry: { width: 40, height: 8, crop: 0.05 } });

    // Assert
    expect(Array.from(canvas.getContext('2d')?.getImageData(0, 4, 1, 1).data ?? [])).toEqual([
      0, 0, 0, 255
    ]);
  });
});
