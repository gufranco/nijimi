import { describe, expect, it } from 'vitest';

import { grabFrame } from './grabFrame';

describe('grabFrame', () => {
  it('reads the RGBA pixels of a drawable source', () => {
    // Arrange
    const canvas = new OffscreenCanvas(2, 1);
    const context = canvas.getContext('2d');
    context?.fillRect(0, 0, 2, 1);
    context?.clearRect(1, 0, 1, 1);

    // Act
    const image = grabFrame(canvas, 2, 1);

    // Assert
    expect([image.width, image.height, ...image.data]).toEqual([2, 1, 0, 0, 0, 255, 0, 0, 0, 0]);
  });
});
