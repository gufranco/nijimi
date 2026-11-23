import { describe, expect, it } from 'vitest';

import { decodePng } from './decodePng';

const pngOf = async (width: number, height: number, fill: string): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = fill;
    context.fillRect(0, 0, width, height);
  }
  return canvas.convertToBlob({ type: 'image/png' });
};

describe('decodePng', () => {
  it('decodes a PNG to straight RGBA bytes', async () => {
    // Arrange
    const blob = await pngOf(3, 2, '#ff8000');

    // Act
    const image = await decodePng(blob);

    // Assert
    expect([image.width, image.height]).toEqual([3, 2]);
    expect(Array.from(image.data.slice(0, 4))).toEqual([255, 128, 0, 255]);
  });

  it('fails clearly when no 2D context can be created', async () => {
    // Arrange
    const blob = await pngOf(1, 1, '#000000');

    // Act
    const decoding = decodePng(blob, () => null);

    // Assert
    await expect(decoding).rejects.toThrow('OffscreenCanvas 2D context is unavailable');
  });

  it('rejects bytes that are not an image', async () => {
    // Arrange
    const blob = new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3])], {
      type: 'image/png'
    });

    // Act
    const decoding = decodePng(blob);

    // Assert
    await expect(decoding).rejects.toThrow();
  });
});
