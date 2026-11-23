import { describe, expect, it } from 'vitest';

import { sizeCanvas } from './sizeCanvas';

describe('sizeCanvas', () => {
  it('resizes a canvas whose size differs', () => {
    // Arrange
    const canvas = document.createElement('canvas');

    // Act
    sizeCanvas(canvas, 40, 30);

    // Assert
    expect([canvas.width, canvas.height]).toEqual([40, 30]);
  });

  it('keeps the drawing buffer of a canvas already at that size', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    sizeCanvas(canvas, 4, 4);
    const context = canvas.getContext('2d');
    context?.fillRect(0, 0, 4, 4);

    // Act
    sizeCanvas(canvas, 4, 4);

    // Assert
    expect(Array.from(context?.getImageData(0, 0, 1, 1).data ?? [])).toEqual([0, 0, 0, 255]);
  });
});
