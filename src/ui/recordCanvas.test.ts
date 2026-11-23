import { describe, expect, it } from 'vitest';

import { recordCanvas } from './recordCanvas';

describe('recordCanvas', () => {
  it('records the canvas for the given time into one video blob', async () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    const timer = setInterval(() => {
      context?.fillRect(0, 0, 16, 8);
    }, 20);

    // Act
    const blob = await recordCanvas({
      canvas,
      mimeType: 'video/webm',
      fps: 30,
      seconds: 0.3,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    });

    // Assert
    clearInterval(timer);
    expect(blob.type).toBe('video/webm');
    expect(blob.size).toBeGreaterThan(0);
  });
});
