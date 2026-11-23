import { describe, expect, it } from 'vitest';

import { createLogger } from '../logging/createLogger';
import type { Logger } from '../logging/createLogger';

import { encodeGif } from '../../tests/fixtures/encodeGif';
import { recordWebm } from '../../tests/fixtures/recordWebm';
import { InputError } from './inputError';
import { openClip } from './openClip';

const sinkLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

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

describe('openClip', () => {
  it('opens a GIF with the image decoder', async () => {
    // Arrange
    const blob = new Blob([RED_BLUE_GIF], { type: 'image/gif' });

    // Act
    const result = await openClip({
      blob,
      doc: document,
      logger: sinkLogger([]),
      Decoder: ImageDecoder
    });

    // Assert
    expect(result.ok ? await result.value.each(() => Promise.resolve(true)) : -1).toBeCloseTo(
      0.2,
      6
    );
  });

  it('opens a WebM with a video element', async () => {
    // Arrange
    const blob = await recordWebm({
      width: 8,
      height: 8,
      colors: ['#00ff00', '#00ff00'],
      frameMs: 120
    });

    // Act
    const result = await openClip({
      blob,
      doc: document,
      logger: sinkLogger([]),
      Decoder: undefined
    });

    // Assert
    const source = result.ok ? result.value : null;
    const widths: number[] = [];
    await source?.each((frame) => {
      widths.splice(widths.length, 0, frame.width);
      return Promise.resolve(false);
    });
    source?.close();
    expect(widths).toEqual([8]);
  });

  it.each([
    ['a type no decoder knows', 'application/zip', ImageDecoder],
    ['a video type the browser cannot play', 'video/x-unknown', ImageDecoder],
    ['an image type the image decoder refuses', 'image/x-unknown', ImageDecoder],
    ['an image when the browser has no image decoder', 'image/gif', undefined]
  ])('refuses %s', async (_, type, Decoder) => {
    // Arrange
    const blob = new Blob([RED_BLUE_GIF], { type });

    // Act
    const result = await openClip({ blob, doc: document, logger: sinkLogger([]), Decoder });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.UnsupportedClip, width: 0, height: 0 });
  });

  it('logs and refuses a GIF the decoder cannot read', async () => {
    // Arrange
    const sink: Error[] = [];
    const blob = new Blob([Uint8Array.from([71, 73, 70, 56, 57, 97, 1, 2, 3])], {
      type: 'image/gif'
    });

    // Act
    const result = await openClip({
      blob,
      doc: document,
      logger: sinkLogger(sink),
      Decoder: ImageDecoder
    });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 0, height: 0 });
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'clip could not be decoded, refusing the file as corrupt'
    ]);
  });
});
