import { describe, expect, it } from 'vitest';

import { createDisplay } from '../display/createDisplay';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';
import { simulateSignal } from '../signal/simulateSignal';
import { createPreview } from './createPreview';
import type { Preview } from './createPreview';

const FRAMES: readonly [RgbFrame] = [
  { width: 16, height: 4, data: new Float32Array(16 * 4 * 3).fill(0.5) }
];

const harness = (
  render: (
    frames: readonly [RgbFrame, ...RgbFrame[]],
    settings: SignalSettings
  ) => Promise<SignalImage>
): { readonly preview: Preview; readonly events: string[] } => {
  const events: string[] = [];
  const preview = createPreview({
    client: { render },
    display: createDisplay(document.createElement('canvas')),
    sourceCanvas: document.createElement('canvas'),
    onBusy: (busy) => events.splice(events.length, 0, busy ? 'busy' : 'idle'),
    onRendered: (image) => events.splice(events.length, 0, `rendered ${String(image.frameCount)}`),
    onError: (error) => events.splice(events.length, 0, `error ${error.message}`)
  });
  return { preview, events };
};

type Render = (
  frames: readonly [RgbFrame, ...RgbFrame[]],
  settings: SignalSettings
) => Promise<SignalImage>;

const counting = (): { readonly calls: number[]; readonly render: Render } => {
  const calls: number[] = [];
  const render: Render = (frames, settings) => {
    calls.splice(calls.length, 0, 1);
    return Promise.resolve(simulateSignal(frames, settings));
  };
  return { calls, render };
};

describe('createPreview', () => {
  it('renders the signal once and redraws display changes from the cached image', async () => {
    // Arrange
    const { calls, render } = counting();
    const { preview, events } = harness(render);
    await preview.update({ frames: FRAMES, framesVersion: 1, settings: DEFAULT_SETTINGS });

    // Act
    await preview.update({
      frames: FRAMES,
      framesVersion: 1,
      settings: { ...DEFAULT_SETTINGS, display: { ...DEFAULT_SETTINGS.display, bloom: 1 } }
    });

    // Assert
    expect(calls).toHaveLength(1);
    expect(events).toEqual(['busy', 'idle', 'rendered 1']);
  });

  it('renders again when the frames change', async () => {
    // Arrange
    const { calls, render } = counting();
    const { preview } = harness(render);
    await preview.update({ frames: FRAMES, framesVersion: 1, settings: DEFAULT_SETTINGS });

    // Act
    await preview.update({ frames: FRAMES, framesVersion: 2, settings: DEFAULT_SETTINGS });

    // Assert
    expect(calls).toHaveLength(2);
  });

  it('drops a slow result once a newer request has started', async () => {
    // Arrange
    const slow = Promise.withResolvers<SignalImage>();
    const queue = [slow.promise, Promise.resolve(simulateSignal(FRAMES, DEFAULT_SETTINGS.signal))];
    const { preview, events } = harness(() => queue.shift() ?? slow.promise);
    const first = preview.update({ frames: FRAMES, framesVersion: 1, settings: DEFAULT_SETTINGS });
    await preview.update({ frames: FRAMES, framesVersion: 2, settings: DEFAULT_SETTINGS });

    // Act
    slow.resolve(simulateSignal(FRAMES, DEFAULT_SETTINGS.signal));
    await first;

    // Assert
    expect(events).toEqual(['busy', 'busy', 'idle', 'rendered 1']);
  });

  it('reports a failed render and drops a stale failure', async () => {
    // Arrange
    const stale = Promise.withResolvers<SignalImage>();
    const queue = [stale.promise, Promise.reject(new Error('worker down'))];
    const { preview, events } = harness(() => queue.shift() ?? stale.promise);
    const first = preview.update({ frames: FRAMES, framesVersion: 1, settings: DEFAULT_SETTINGS });
    await preview.update({ frames: FRAMES, framesVersion: 2, settings: DEFAULT_SETTINGS });

    // Act
    stale.reject(new Error('too late'));
    await first;

    // Assert
    expect(events).toEqual(['busy', 'busy', 'idle', 'error worker down']);
  });

  it('redraws the last frame on request and does nothing before the first render', async () => {
    // Arrange
    const { calls, render } = counting();
    const canvas = document.createElement('canvas');
    const preview = createPreview({
      client: { render },
      display: createDisplay(canvas),
      sourceCanvas: document.createElement('canvas'),
      onBusy: () => undefined,
      onRendered: () => undefined,
      onError: () => undefined
    });
    preview.redraw();
    const before = canvas.width;
    await preview.update({ frames: FRAMES, framesVersion: 1, settings: DEFAULT_SETTINGS });

    // Act
    preview.redraw();

    // Assert
    expect(before).toBe(300);
    expect(canvas.width).toBeGreaterThan(0);
    expect(calls).toHaveLength(1);
  });

  it('does nothing before an image is loaded', async () => {
    // Arrange
    const { calls, render } = counting();
    const { preview, events } = harness(render);

    // Act
    await preview.update({ frames: null, framesVersion: 0, settings: DEFAULT_SETTINGS });

    // Assert
    expect(calls).toHaveLength(0);
    expect(events).toEqual([]);
  });
});
