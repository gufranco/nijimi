import { describe, expect, it } from 'vitest';

import { recordWebm } from '../../tests/fixtures/recordWebm';
import { createLogger } from '../logging/createLogger';
import type { Logger } from '../logging/createLogger';
import { openVideoClip } from './openVideoClip';

const sinkLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'];

describe('openVideoClip', () => {
  it('plays the clip through, offering frames in time order from the first, and returns its length', async () => {
    // Arrange
    const blob = await recordWebm({ width: 16, height: 8, colors: COLORS, frameMs: 120 });
    const source = await openVideoClip({ blob, doc: document, logger: sinkLogger([]) });
    const seen: (readonly [number, number])[] = [];

    // Act
    const duration = await source.each((frame, seconds) => {
      seen.splice(seen.length, 0, [seconds, frame.data[0] ?? -1]);
      return Promise.resolve(true);
    });

    // Assert
    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen.map(([seconds]) => seconds)).toEqual(
      [...seen.map(([seconds]) => seconds)].toSorted((a, b) => a - b)
    );
    expect(seen[0]?.[0]).toBe(0);
    expect(seen[0]?.[1]).toBeGreaterThan(240);
    expect(duration).toBeGreaterThanOrEqual(seen.at(-1)?.[0] ?? Infinity);
    expect(document.querySelectorAll('video.clip-decoder')).toHaveLength(1);
    source.close();
    expect(document.querySelectorAll('video.clip-decoder')).toHaveLength(0);
  });

  it('stops at once when the visitor declines the first frame', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await openVideoClip({ blob, doc: document, logger: sinkLogger([]) });
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

  it('stops at the first played frame the visitor declines', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await openVideoClip({ blob, doc: document, logger: sinkLogger([]) });
    const seen: number[] = [];

    // Act
    const stoppedAt = await source.each((_, seconds) => {
      seen.splice(seen.length, 0, seconds);
      return Promise.resolve(seen.length < 2);
    });

    // Assert
    expect(seen).toHaveLength(2);
    expect(stoppedAt).toBe(seen[1]);
    source.close();
  });

  it('rejects when the visitor fails', async () => {
    // Arrange
    const blob = await recordWebm({ width: 8, height: 8, colors: COLORS, frameMs: 120 });
    const source = await openVideoClip({ blob, doc: document, logger: sinkLogger([]) });

    // Act
    const playing = source.each(() => Promise.reject(new Error('store full')));

    // Assert
    await expect(playing).rejects.toThrow('store full');
    source.close();
  });

  it('logs, releases and rejects a video that cannot load', async () => {
    // Arrange
    const sink: Error[] = [];
    const blob = new Blob([Uint8Array.from([1, 2, 3, 4])], { type: 'video/webm' });

    // Act
    const opening = openVideoClip({ blob, doc: document, logger: sinkLogger(sink) });

    // Assert
    await expect(opening).rejects.toThrow('an error event arrived while waiting for loadeddata');
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'video failed to load, releasing it'
    ]);
    expect(document.querySelectorAll('video.clip-decoder')).toHaveLength(0);
  });
});
