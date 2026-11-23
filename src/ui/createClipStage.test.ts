import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../clip/createMemoryStore';
import type { FrameStore } from '../clip/types';
import { createDisplay } from '../display/createDisplay';
import type { Display } from '../display/types';
import type { LoadedClip } from '../input/types';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { simulateSignal } from '../signal/simulateSignal';
import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';
import { createClipStage } from './createClipStage';
import type { ClipStage } from './createClipStage';
import type { Scheduler } from './createClipPlayer';

type Render = (
  frames: readonly [RgbFrame, ...RgbFrame[]],
  settings: SignalSettings
) => Promise<SignalImage>;

const clipOf = async (): Promise<LoadedClip> => {
  const store = createMemoryStore();
  await store.append(
    Uint8Array.from({ length: 8 * 2 * 4 }, (_, index) => (index % 4 === 3 ? 255 : 0))
  );
  await store.append(Uint8Array.from({ length: 8 * 2 * 4 }, () => 255));
  return {
    image: {
      frame: { width: 8, height: 2, data: new Float32Array(48) },
      scale: 1,
      detectedScale: 1,
      stats: { colors: 2, levels: 2 }
    },
    frames: await store.seal(8 * 2 * 4),
    times: [0, 0.02],
    duration: 0.04
  };
};

const simulate: Render = (frames, settings) => Promise.resolve(simulateSignal(frames, settings));

interface Harness {
  readonly stage: ClipStage;
  readonly events: string[];
  readonly drawnBloom: number[];
  readonly renders: number[];
  readonly discarded: string[];
  readonly source: HTMLCanvasElement;
  readonly pending: () => number;
}

const harness = (
  options: {
    readonly render?: Render;
    readonly onLastField?: (stage: ClipStage) => void;
    readonly failReads?: boolean;
  } = {}
): Harness => {
  const events: string[] = [];
  const drawnBloom: number[] = [];
  const renders: number[] = [];
  const discarded: string[] = [];
  const source = document.createElement('canvas');
  const real = createDisplay(document.createElement('canvas'));
  const display: Display = {
    ...real,
    draw: (input) => {
      drawnBloom.splice(drawnBloom.length, 0, input.settings.bloom);
      return real.draw(input);
    }
  };
  let ticks = 0;
  const scheduler: Scheduler = {
    request: () => {
      ticks += 1;
      return ticks;
    },
    cancel: () => {
      ticks -= 1;
    }
  };
  const openStore = (): Promise<FrameStore> => {
    const memory = createMemoryStore();
    return Promise.resolve({
      append: memory.append,
      seal: async (frameBytes) => {
        const reader = await memory.seal(frameBytes);
        return {
          ...reader,
          read:
            options.failReads === true
              ? () => Promise.reject(new Error('read failed'))
              : reader.read,
          discard: () => {
            discarded.splice(discarded.length, 0, `${String(reader.count)} fields`);
            return reader.discard();
          }
        };
      }
    });
  };
  const render = options.render ?? simulate;
  const stage: ClipStage = createClipStage({
    clients: () => [
      {
        render: (frames, settings) => {
          renders.splice(renders.length, 0, 1);
          return render(frames, settings);
        }
      }
    ],
    openStore,
    fieldRate: () => 50,
    display,
    sourceCanvas: source,
    scheduler,
    onBusy: (busy) => events.splice(events.length, 0, busy ? 'busy' : 'idle'),
    onProgress: (done, total) => {
      events.splice(events.length, 0, `${String(done)}/${String(total)}`);
      if (done === total) {
        options.onLastField?.(stage);
      }
    },
    onError: (error) => events.splice(events.length, 0, `error ${error.message}`)
  });
  return { stage, events, drawnBloom, renders, discarded, source, pending: () => ticks };
};

describe('createClipStage', () => {
  it('renders every field of the clip, then plays it with the original beside it', async () => {
    // Arrange
    const { stage, events, drawnBloom, source, pending } = harness();
    const clip = await clipOf();

    // Act
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });

    // Assert
    expect(events).toEqual(['busy', '1/2', '2/2', 'idle']);
    expect(drawnBloom).toEqual([DEFAULT_SETTINGS.display.bloom]);
    expect(Number(source.getAttribute('width'))).toBeGreaterThan(0);
    expect(pending()).toBe(1);
  });

  it('redraws a screen-only change without rendering the signal again', async () => {
    // Arrange
    const { stage, drawnBloom, renders } = harness();
    const clip = await clipOf();
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });
    const brighter = { ...DEFAULT_SETTINGS, display: { ...DEFAULT_SETTINGS.display, bloom: 0.9 } };

    // Act
    await stage.show({ clip, clipVersion: 1, settings: brighter });

    // Assert
    expect(renders).toHaveLength(2);
    expect(drawnBloom).toEqual([DEFAULT_SETTINGS.display.bloom, 0.9]);
  });

  it('drops and discards a render that a newer signal change supersedes, and the fields it replaces', async () => {
    // Arrange
    const { stage, events, discarded } = harness();
    const clip = await clipOf();
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });
    const first = stage.show({
      clip,
      clipVersion: 1,
      settings: { ...DEFAULT_SETTINGS, signal: { ...DEFAULT_SETTINGS.signal, saturation: 1.5 } }
    });

    // Act
    const second = stage.show({
      clip,
      clipVersion: 1,
      settings: { ...DEFAULT_SETTINGS, signal: { ...DEFAULT_SETTINGS.signal, saturation: 0.5 } }
    });
    await Promise.all([first, second]);

    // Assert
    expect(events.filter((event) => !event.includes('/'))).toEqual([
      'busy',
      'idle',
      'busy',
      'busy',
      'idle'
    ]);
    expect(discarded).toEqual(['2 fields', '0 fields']);
  });

  it('discards a render that finished after it was stopped', async () => {
    // Arrange
    const { stage, discarded, pending } = harness({
      onLastField: (current) => {
        current.stop();
      }
    });
    const clip = await clipOf();

    // Act
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });

    // Assert
    expect(discarded).toEqual(['2 fields']);
    expect(pending()).toBe(0);
  });

  it('reports a render failure and plays nothing', async () => {
    // Arrange
    const { stage, events, discarded, pending } = harness({
      render: () => Promise.reject(new Error('worker crashed'))
    });
    const clip = await clipOf();

    // Act
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });

    // Assert
    expect(events).toEqual(['busy', 'idle', 'error worker crashed']);
    expect(discarded).toEqual(['0 fields']);
    expect(pending()).toBe(0);
  });

  it('reports a field that cannot be read back while playing', async () => {
    // Arrange
    const { stage, events } = harness({ failReads: true });
    const clip = await clipOf();

    // Act
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });

    // Assert
    expect(events).toEqual(['busy', '1/2', '2/2', 'idle', 'error read failed']);
  });

  it('rewinds the playing clip to its first field and stops playing on stop', async () => {
    // Arrange
    const { stage, drawnBloom, pending } = harness();
    const clip = await clipOf();
    await stage.rewind();
    await stage.show({ clip, clipVersion: 1, settings: DEFAULT_SETTINGS });

    // Act
    await stage.rewind();
    stage.stop();

    // Assert
    expect(drawnBloom).toHaveLength(2);
    expect(pending()).toBe(0);
  });
});
