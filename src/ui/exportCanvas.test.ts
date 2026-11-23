import { describe, expect, it } from 'vitest';

import { exportCanvas } from './exportCanvas';

describe('exportCanvas', () => {
  it('hands a PNG of the canvas to the download', async () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.setAttribute('width', '4');
    canvas.setAttribute('height', '2');
    const saved: { blob: Blob; name: string }[] = [];

    // Act
    await exportCanvas({
      canvas,
      name: 'nijimi.png',
      download: (blob, name) => saved.splice(saved.length, 0, { blob, name })
    });

    // Assert
    expect(saved[0]?.name).toBe('nijimi.png');
    expect(saved[0]?.blob.type).toBe('image/png');
  });

  it('rejects when the canvas yields no image', async () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.setAttribute('width', '0');

    // Act
    const exporting = exportCanvas({ canvas, name: 'x.png', download: () => undefined });

    // Assert
    await expect(exporting).rejects.toThrow('the preview canvas produced no PNG');
  });
});
