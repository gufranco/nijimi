import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../clip/createMemoryStore';
import type { FrameStore } from '../clip/types';
import { createLogger } from '../logging/createLogger';
import { ConsolePreset } from '../signal/consolePreset';
import { VideoStandard } from '../signal/videoStandard';
import type { Logger } from '../logging/createLogger';
import { InputError } from './inputError';
import { loadClip } from './loadClip';
import type { ClipSource, RgbaImage } from './types';

const solid = (
  width: number,
  height: number,
  rgb: readonly [number, number, number]
): RgbaImage => ({
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, index) =>
    index % 4 === 3 ? 255 : (rgb[index % 4] ?? 0)
  )
});

const sinkLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

interface Played {
  readonly source: ClipSource;
  readonly closed: string[];
  readonly offered: number[];
}

const played = (
  frames: readonly (readonly [RgbaImage, number])[],
  duration: number,
  lossy = false
): Played => {
  const closed: string[] = [];
  const offered: number[] = [];
  return {
    closed,
    offered,
    source: {
      lossy,
      hasAudio: () => lossy,
      each: async (visit) => {
        for (const [frame, seconds] of frames) {
          offered.splice(offered.length, 0, seconds);
          if (!(await visit(frame, seconds))) {
            return seconds;
          }
        }
        return duration;
      },
      close: () => {
        closed.splice(closed.length, 0, 'closed');
      }
    }
  };
};

const load = (
  source: ClipSource,
  overrides: {
    readonly scaleOverride?: number;
    readonly store?: FrameStore;
    readonly sink?: Error[];
    readonly progress?: number[];
  } = {}
): ReturnType<typeof loadClip> =>
  loadClip({
    source,
    scaleOverride: overrides.scaleOverride ?? 1,
    preset: ConsolePreset.MasterSystem,
    standard: VideoStandard.Ntsc,
    store: overrides.store ?? createMemoryStore(),
    onProgress: (decoded) => overrides.progress?.splice(overrides.progress.length, 0, decoded),
    logger: sinkLogger(overrides.sink ?? [])
  });

describe('loadClip', () => {
  it('stores every frame of the whole clip at native size with its time, counts colors and closes the source', async () => {
    // Arrange
    const clip = played(
      Array.from(
        { length: 700 },
        (_, index) =>
          [solid(4, 2, index % 2 === 0 ? [255, 0, 0] : [0, 0, 255]), index / 50] as const
      ),
      14
    );
    const progress: number[] = [];

    // Act
    const result = await load(clip.source, { progress });

    // Assert
    expect(result.ok).toBe(true);
    expect(
      result.ok
        ? [
            result.value.frames.count,
            result.value.times.length,
            result.value.times.at(-1),
            result.value.duration,
            result.value.image.stats
          ]
        : []
    ).toEqual([700, 700, 699 / 50, 14, { colors: 2, levels: 2 }]);
    expect(result.ok ? [...(await result.value.frames.read(1))].slice(0, 4) : []).toEqual([
      0, 0, 255, 255
    ]);
    expect([progress.length, progress.at(-1)]).toEqual([700, 700]);
    expect(clip.closed).toEqual(['closed']);
  });

  it('detects the scale on the first frame', async () => {
    // Arrange
    const clip = played([[solid(16, 8, [10, 20, 30]), 0]], 0.1);

    // Act
    const result = await load(clip.source, { scaleOverride: 4 });

    // Assert
    expect(
      result.ok
        ? [
            result.value.image.scale,
            result.value.image.frame.width,
            result.value.image.frame.height
          ]
        : []
    ).toEqual([4, 4, 2]);
  });

  it('stops at a first frame larger than 4096 pixels on a side', async () => {
    // Arrange
    const clip = played(
      [
        [{ width: 4097, height: 1, data: new Uint8ClampedArray(4097 * 4) }, 0],
        [solid(1, 1, [0, 0, 0]), 1]
      ],
      2
    );

    // Act
    const result = await load(clip.source);

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.TooLarge, width: 4097, height: 1 });
    expect(clip.offered).toEqual([0]);
  });

  it('refuses art wider than 1024 native pixels', async () => {
    // Arrange
    const clip = played([[solid(1100, 1, [1, 0, 0]), 0]], 1);

    // Act
    const result = await load(clip.source);

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.TooLarge, width: 1100, height: 1 });
  });

  it('stops and refuses a clip whose frames change size', async () => {
    // Arrange
    const clip = played(
      [
        [solid(4, 4, [1, 2, 3]), 0],
        [solid(8, 4, [1, 2, 3]), 0.1],
        [solid(4, 4, [1, 2, 3]), 0.2]
      ],
      0.3
    );

    // Act
    const result = await load(clip.source);

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 8, height: 4 });
    expect(clip.offered).toEqual([0, 0.1]);
  });

  it('refuses a clip that has no frames', async () => {
    // Arrange
    const clip = played([], 0);

    // Act
    const result = await load(clip.source);

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 0, height: 0 });
  });

  it('logs, refuses as corrupt and closes the source when storing a frame fails', async () => {
    // Arrange
    const sink: Error[] = [];
    const clip = played([[solid(2, 2, [1, 2, 3]), 0]], 1);
    const full: FrameStore = {
      append: () => Promise.reject(new DOMException('no space left', 'QuotaExceededError')),
      seal: () => Promise.reject(new Error('unreachable'))
    };

    // Act
    const result = await load(clip.source, { store: full, sink });

    // Assert
    expect(result).toEqual({ ok: false, error: InputError.Corrupt, width: 0, height: 0 });
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'clip decoding failed, refusing the clip as corrupt'
    ]);
    expect(clip.closed).toEqual(['closed']);
  });

  it('finds the console scale of a compressed video and samples each block at its centre', async () => {
    // Arrange
    const noisy: RgbaImage = {
      width: 768,
      height: 576,
      data: Uint8ClampedArray.from({ length: 768 * 576 * 4 }, (_, index) =>
        index % 4 === 3 ? 255 : 80 + ((index * 37) % 7)
      )
    };
    const clip = played([[noisy, 0]], 0.1, true);

    // Act
    const result = await load(clip.source, { scaleOverride: 0 });

    // Assert
    expect(
      result.ok
        ? [
            result.value.image.frame.width,
            result.value.image.frame.height,
            result.value.image.detectedScale,
            result.value.image.presence?.length
          ]
        : []
    ).toEqual([256, 192, 3, 524_288]);
  });

  it('keeps an exact upscale or a chosen scale on a compressed video', async () => {
    // Arrange
    const exact = played([[solid(768, 576, [1, 2, 3]), 0]], 0.1, true);
    const chosen = played([[solid(768, 576, [1, 2, 3]), 0]], 0.1, true);

    // Act
    const results = [
      await load(exact.source, { scaleOverride: 0 }),
      await load(chosen.source, { scaleOverride: 1 })
    ];

    // Assert
    expect(results.map((result) => (result.ok ? result.value.image.scale : 0))).toEqual([8, 1]);
  });

  it('keeps no palette data for a lossless clip', async () => {
    // Arrange
    const clip = played([[solid(4, 2, [1, 2, 3]), 0]], 0.1);

    // Act
    const result = await load(clip.source);

    // Assert
    expect(result.ok ? [result.value.image.presence, result.value.audio] : 'refused').toEqual([
      null,
      false
    ]);
  });
});
