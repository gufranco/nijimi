import { describe, expect, it } from 'vitest';

import { vp9LevelFor } from './vp9Level';

describe('vp9LevelFor', () => {
  it.each([
    [16, 8, '10'],
    [256, 144, '10'],
    [256, 145, '11'],
    [320, 240, '20'],
    [640, 384, '21'],
    [1920, 1080, '40'],
    [3840, 2160, '50'],
    [8192, 4352, '60'],
    [8193, 4352, '62']
  ])('names the lowest level whose picture size holds %i x %i as %s', (width, height, level) => {
    // Arrange
    const pictureSize = width * height;

    // Act
    const found = vp9LevelFor(pictureSize);

    // Assert
    expect(found).toBe(level);
  });
});
