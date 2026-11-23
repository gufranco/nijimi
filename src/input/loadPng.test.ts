import { describe, expect, it } from 'vitest';

import { createLogger } from '../logging/createLogger';
import { InputError } from './inputError';
import { loadPng } from './loadPng';
import type { Logger } from '../logging/createLogger';

const silentLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

const pngOf = async (width: number, height: number, type = 'image/png'): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = '#3366cc';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffcc00';
    context.fillRect(0, 0, width / 2, height / 2);
  }
  return canvas.convertToBlob({ type });
};

describe('loadPng', () => {
  it('loads a PNG and detects the largest integer scale up to 8', async () => {
    // Arrange
    const blob = await pngOf(64, 32);

    // Act
    const result = await loadPng({ blob, scaleOverride: 0, logger: silentLogger([]) });

    // Assert
    expect(result.ok).toBe(true);
    expect(
      result.ok
        ? [result.value.frame.width, result.value.frame.height, result.value.detectedScale]
        : []
    ).toEqual([8, 4, 8]);
  });

  it('counts the colors and channel levels of the native picture', async () => {
    // Arrange
    const blob = await pngOf(64, 32);

    // Act
    const result = await loadPng({ blob, scaleOverride: 0, logger: silentLogger([]) });

    // Assert
    expect(result.ok ? result.value.stats : null).toEqual({ colors: 2, levels: 2 });
  });

  it('applies a scale override that divides the image', async () => {
    // Arrange
    const blob = await pngOf(64, 32);

    // Act
    const result = await loadPng({ blob, scaleOverride: 4, logger: silentLogger([]) });

    // Assert
    expect(result.ok ? [result.value.frame.width, result.value.scale] : []).toEqual([16, 4]);
  });

  it('ignores a scale override that does not divide the image', async () => {
    // Arrange
    const blob = await pngOf(30, 30);

    // Act
    const result = await loadPng({ blob, scaleOverride: 4, logger: silentLogger([]) });

    // Assert
    expect(result.ok ? result.value.scale : 0).toBe(result.ok ? result.value.detectedScale : -1);
  });

  it('refuses a JPEG', async () => {
    // Arrange
    const blob = await pngOf(8, 8, 'image/jpeg');

    // Act
    const result = await loadPng({ blob, scaleOverride: 0, logger: silentLogger([]) });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.NotPng, width: 0, height: 0 });
  });

  it('refuses a file over 32 MB before reading it', async () => {
    // Arrange
    const blob = new Blob([new Uint8Array(32 * 1024 * 1024 + 1)]);

    // Act
    const result = await loadPng({ blob, scaleOverride: 0, logger: silentLogger([]) });

    // Assert
    expect(result.ok ? null : result.error).toBe(InputError.FileTooBig);
  });

  it('refuses a picture wider than 4096 from its header alone', async () => {
    // Arrange
    const header = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0,
      0x20, 0, 0, 0, 0, 16
    ]);

    // Act
    const result = await loadPng({
      blob: new Blob([header]),
      scaleOverride: 0,
      logger: silentLogger([])
    });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.TooLarge, width: 8192, height: 16 });
  });

  it('refuses art whose native size is over 1024', async () => {
    // Arrange
    const canvas = new OffscreenCanvas(1100, 4);
    const context = canvas.getContext('2d');
    context?.fillRect(0, 0, 1, 1);
    const blob = await canvas.convertToBlob({ type: 'image/png' });

    // Act
    const result = await loadPng({ blob, scaleOverride: 0, logger: silentLogger([]) });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.TooLarge, width: 1100, height: 4 });
  });

  it('logs and refuses a PNG that cannot be decoded', async () => {
    // Arrange
    const good = new Uint8Array(await (await pngOf(8, 8)).arrayBuffer());
    const broken = new Blob([good.slice(0, 40)]);
    const reported: Error[] = [];

    // Act
    const result = await loadPng({
      blob: broken,
      scaleOverride: 0,
      logger: silentLogger(reported)
    });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 8, height: 8 });
    expect(reported[0]?.message).toContain('PNG integrity check failed');
  });

  it('logs and refuses an intact PNG the browser cannot decode', async () => {
    // Arrange
    const ascii = (text: string): number[] =>
      Array.from(text, (character) => character.charCodeAt(0));
    const u32 = (value: number): number[] => [
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff
    ];
    const { crc32 } = await import('./crc32');
    const chunk = (type: string, data: readonly number[]): number[] => {
      const body = Uint8Array.from([...ascii(type), ...data]);
      return [...u32(data.length), ...body, ...u32(crc32(body))];
    };
    const zlib = new Uint8Array(
      await new Response(
        new Blob([new Uint8Array(4)]).stream().pipeThrough(new CompressionStream('deflate'))
      ).arrayBuffer()
    );
    const png = Uint8Array.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk('IHDR', [...u32(1), ...u32(1), 8, 9, 0, 0, 0]),
      ...chunk('IDAT', Array.from(zlib)),
      ...chunk('IEND', [])
    ]);
    const reported: Error[] = [];

    // Act
    const result = await loadPng({
      blob: new Blob([png]),
      scaleOverride: 0,
      logger: silentLogger(reported)
    });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 1, height: 1 });
    expect(reported[0]?.message).toContain('PNG decode failed');
  });
});
