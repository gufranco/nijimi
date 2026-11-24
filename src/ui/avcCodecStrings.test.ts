import { describe, expect, it } from 'vitest';

import { avcCodecStrings } from './avcCodecStrings';

describe('avcCodecStrings', () => {
  it.each([
    [16, 10, 25, '0a'],
    [176, 144, 25, '0b'],
    [176, 144, 30.5, '0c'],
    [352, 288, 59.94, '1e'],
    [640, 480, 59.94, '1f'],
    [1280, 960, 59.94, '2a'],
    [1920, 1080, 59.94, '2a'],
    [3840, 2160, 30, '33'],
    [3840, 2160, 59.94, '34'],
    [4096, 16, 1, '28'],
    [8192, 8192, 120, '3e']
  ])(
    'offers High, then Main, then Constrained Baseline at the lowest level that holds %i x %i at %s frames per second: %s',
    (width, height, frameRate, level) => {
      // Arrange
      const size = { width, height, frameRate };

      // Act
      const strings = avcCodecStrings(size);

      // Assert
      expect(strings).toEqual([`avc1.6400${level}`, `avc1.4d00${level}`, `avc1.4240${level}`]);
    }
  );
});
