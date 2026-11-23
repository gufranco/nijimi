import { describe, expect, it } from 'vitest';

import { encodeGif } from '../../tests/fixtures/encodeGif';
import { openImageClip } from './openImageClip';
import type { RgbaImage } from './types';

const RED_BLUE_GIF = encodeGif({
  width: 2,
  height: 1,
  palette: [
    [0, 0, 0],
    [255, 0, 0],
    [0, 0, 255],
    [255, 255, 255]
  ],
  frames: [
    { pixels: [1, 1], delayCentiseconds: 10 },
    { pixels: [2, 3], delayCentiseconds: 10 }
  ]
});

describe('openImageClip', () => {
  it('offers every frame with its start time and returns the total length', async () => {
    // Arrange
    const source = await openImageClip({
      blob: new Blob([RED_BLUE_GIF], { type: 'image/gif' }),
      Decoder: ImageDecoder
    });
    const seen: (readonly [number, readonly number[]])[] = [];

    // Act
    const duration = await source.each((frame: RgbaImage, seconds) => {
      seen.splice(seen.length, 0, [seconds, [...frame.data]]);
      return Promise.resolve(true);
    });

    // Assert
    expect(duration).toBeCloseTo(0.2, 6);
    expect(seen.map(([seconds]) => seconds)).toEqual([0, 0.1]);
    expect(seen.map(([, data]) => data)).toEqual([
      [255, 0, 0, 255, 255, 0, 0, 255],
      [0, 0, 255, 255, 255, 255, 255, 255]
    ]);
    source.close();
  });

  it('stops when the visitor declines more frames', async () => {
    // Arrange
    const source = await openImageClip({
      blob: new Blob([RED_BLUE_GIF], { type: 'image/gif' }),
      Decoder: ImageDecoder
    });
    const seen: number[] = [];

    // Act
    const stoppedAt = await source.each((_, seconds) => {
      seen.splice(seen.length, 0, seconds);
      return Promise.resolve(false);
    });

    // Assert
    expect([stoppedAt, seen]).toEqual([0, [0]]);
    source.close();
  });
});
