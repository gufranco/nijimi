import { registerDecoder } from 'mediabunny';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import { recordWebm } from '../../tests/fixtures/recordWebm';
import { createLogger } from '../logging/createLogger';
import type { Logger } from '../logging/createLogger';
import { openVideoClip } from './openVideoClip';
import { OpaqueVpxDecoder } from './OpaqueVpxDecoder';
import type { ClipSource } from './types';

const sinkLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'];
const NAMES = ['red', 'green', 'blue', 'white'];

const opened: ClipSource[] = [];

beforeAll(() => {
  registerDecoder(OpaqueVpxDecoder);
});

afterEach(() => {
  opened.splice(0).forEach((source) => {
    source.close();
  });
});

const open = async (blob: Blob): Promise<ClipSource> => {
  const source = await openVideoClip({ blob, logger: sinkLogger([]) });
  opened.splice(opened.length, 0, source);
  return source;
};

const colorName = (rgb: readonly number[]): string => {
  const lit = rgb.map((channel) => channel > 128);
  if (lit.every(Boolean)) {
    return 'white';
  }
  return NAMES[lit.indexOf(true)] ?? 'black';
};

const distinctRuns = (names: readonly string[]): readonly string[] =>
  names.filter((name, index) => index === 0 || name !== names[index - 1]);

describe('openVideoClip', () => {
  it('decodes every frame of the clip in time order from zero and returns its length', async () => {
    // Arrange
    const blob = await recordWebm({ width: 16, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);
    const seen: (readonly [number, readonly number[]])[] = [];

    // Act
    const duration = await source.each((frame, seconds) => {
      seen.splice(seen.length, 0, [seconds, [...frame.data.slice(0, 3)]]);
      return Promise.resolve(true);
    });

    // Assert
    const times = seen.map(([seconds]) => seconds);
    expect(distinctRuns(seen.map(([, rgb]) => colorName(rgb)))).toEqual(NAMES);
    expect(times).toEqual(times.toSorted((a, b) => a - b));
    expect(times[0]).toBe(0);
    expect(duration).toBeGreaterThanOrEqual(times.at(-1) ?? Infinity);
  });

  it('decodes every frame of a fragmented MP4 recording', async () => {
    // Arrange
    const blob = await recordWebm({
      width: 16,
      height: 8,
      colors: COLORS,
      frameMs: 120,
      mimeType: 'video/mp4'
    });
    const source = await open(blob);
    const seen: string[] = [];

    // Act
    await source.each((frame) => {
      seen.splice(seen.length, 0, colorName([...frame.data.slice(0, 3)]));
      return Promise.resolve(true);
    });

    // Assert
    expect([blob.type, distinctRuns(seen)]).toEqual(['video/mp4', NAMES]);
  });

  it('decodes the clip again from its first frame on every pass', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);
    await source.each(() => Promise.resolve(true));
    const seen: number[] = [];

    // Act
    await source.each((_, seconds) => {
      seen.splice(seen.length, 0, seconds);
      return Promise.resolve(false);
    });

    // Assert
    expect(seen).toEqual([0]);
  });

  it('stops at once when the visitor declines the first frame', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);
    const seen: number[] = [];

    // Act
    const stoppedAt = await source.each((_, seconds) => {
      seen.splice(seen.length, 0, seconds);
      return Promise.resolve(false);
    });

    // Assert
    expect([stoppedAt, seen]).toEqual([0, [0]]);
  });

  it('stops at the frame the visitor declines', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);
    const seen: number[] = [];

    // Act
    const stoppedAt = await source.each((_, seconds) => {
      seen.splice(seen.length, 0, seconds);
      return Promise.resolve(seen.length < 2);
    });

    // Assert
    expect(seen).toHaveLength(2);
    expect(stoppedAt).toBe(seen[1]);
  });

  it('rejects when the visitor fails', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);

    // Act
    const playing = source.each(() => Promise.reject(new Error('store full')));

    // Assert
    await expect(playing).rejects.toThrow('store full');
  });

  it('logs and rejects a file that is not a video it can read', async () => {
    // Arrange
    const sink: Error[] = [];
    const blob = new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'video/webm' });

    // Act
    const opening = openVideoClip({ blob, logger: sinkLogger(sink) });

    // Assert
    await expect(opening).rejects.toThrow('Input has an unsupported or unrecognizable format.');
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'video could not be opened, releasing it'
    ]);
  });

  it('logs and rejects a file with no video track', async () => {
    // Arrange
    const sink: Error[] = [];
    const blob = await recordWebm({
      width: 8,
      height: 8,
      colors: COLORS,
      frameMs: 120,
      audio: true,
      video: false
    });

    // Act
    const opening = openVideoClip({ blob, logger: sinkLogger(sink) });

    // Assert
    await expect(opening).rejects.toThrow('decodable video track is unavailable');
    expect(sink).toHaveLength(1);
  });

  it('tells whether the clip has sound', async () => {
    // Arrange
    const silentBlob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const loudBlob = await recordWebm({
      width: 8,
      height: 8,
      colors: COLORS,
      frameMs: 120,
      audio: true
    });

    // Act
    const [silent, loud] = await Promise.all([open(silentBlob), open(loudBlob)]);

    // Assert
    expect([silent.hasAudio(), loud.hasAudio()]).toEqual([false, true]);
  });

  it('refuses to decode after it was closed', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await open(blob);
    source.close();

    // Act
    const decoding = source.each(() => Promise.resolve(true));

    // Assert
    await expect(decoding).rejects.toThrow('Input has been disposed.');
  });
});
