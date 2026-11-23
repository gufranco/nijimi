import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../clip/createMemoryStore';
import type { FrameReader } from '../clip/types';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { ConsolePreset } from '../signal/consolePreset';
import { ScanMode } from '../signal/scanMode';
import { simulateSignal } from '../signal/simulateSignal';
import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';
import { VideoStandard } from '../signal/videoStandard';
import type { SignalClient } from '../worker/createSignalClient';
import { renderClip } from './renderClip';

const WIDTH = 8;
const HEIGHT = 2;

const nativeFrames = async (levels: readonly number[]): Promise<FrameReader> => {
  const store = createMemoryStore();
  await levels.reduce(async (previous, level) => {
    await previous;
    await store.append(
      Uint8Array.from({ length: WIDTH * HEIGHT * 4 }, (_, index) => (index % 4 === 3 ? 255 : level))
    );
  }, Promise.resolve());
  return store.seal(WIDTH * HEIGHT * 4);
};

const recordingClient = (name: string, seen: string[]): SignalClient => ({
  render: (
    frames: readonly [RgbFrame, ...RgbFrame[]],
    settings: SignalSettings
  ): Promise<SignalImage> => {
    seen.splice(
      seen.length,
      0,
      `${name}:${String(settings.frameIndex)}:${String(Math.round((frames[0].data[0] ?? 0) * 255))}`
    );
    return Promise.resolve(simulateSignal(frames, settings));
  }
});

const GENESIS_INTERLACED: SignalSettings = {
  ...DEFAULT_SETTINGS.signal,
  preset: ConsolePreset.GenesisH40,
  standard: VideoStandard.Ntsc,
  scan: ScanMode.Interlaced
};

describe('renderClip', () => {
  it('renders each field from its source frame in batches across the workers and stores them in order', async () => {
    // Arrange
    const seen: string[] = [];
    const progress: string[] = [];
    const store = createMemoryStore();

    // Act
    const rendered = await renderClip({
      clients: [recordingClient('a', seen), recordingClient('b', seen)],
      frames: await nativeFrames([0, 255]),
      width: WIDTH,
      height: HEIGHT,
      sources: Uint32Array.from([0, 0, 1]),
      settings: GENESIS_INTERLACED,
      store,
      signal: new AbortController().signal,
      onProgress: (done, total) =>
        progress.splice(progress.length, 0, `${String(done)}/${String(total)}`)
    });

    // Assert
    expect(seen).toEqual(['a:0:0', 'b:1:0', 'a:0:255']);
    expect(progress).toEqual(['2/3', '3/3']);
    expect([rendered.fields.count, rendered.layout.frameCount, rendered.layout.height]).toEqual([
      3,
      1,
      HEIGHT
    ]);
    expect((await rendered.fields.read(2)).length).toBe(
      rendered.layout.width * rendered.layout.height * 3
    );
  });

  it('stops at the next batch once aborted', async () => {
    // Arrange
    const seen: string[] = [];
    const controller = new AbortController();

    // Act
    const rendering = renderClip({
      clients: [recordingClient('a', seen)],
      frames: await nativeFrames([0, 128, 255]),
      width: WIDTH,
      height: HEIGHT,
      sources: Uint32Array.from([0, 1, 2]),
      settings: DEFAULT_SETTINGS.signal,
      store: createMemoryStore(),
      signal: controller.signal,
      onProgress: () => {
        controller.abort(new Error('superseded'));
      }
    });

    // Assert
    await expect(rendering).rejects.toThrow('superseded');
    expect(seen).toHaveLength(1);
  });
});
