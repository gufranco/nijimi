import { readNative } from '../clip/readNative';
import type { FrameReader, FrameStore } from '../clip/types';
import { toRgbFrame } from '../input/toRgbFrame';
import { cyclic } from '../signal/cyclic';
import { frameCycle } from '../signal/frameCycle';
import { FrameView } from '../signal/frameView';
import { packSignalImage } from '../signal/packSignalImage';
import { resolveTiming } from '../signal/resolveTiming';
import type { PackedSignalImage, SignalSettings } from '../signal/types';
import type { SignalClient } from '../worker/createSignalClient';

export interface SignalLayout {
  readonly width: number;
  readonly height: number;
  readonly sampleAspect: number;
  readonly frameCount: number;
}

export interface RenderedClip {
  readonly fields: FrameReader;
  readonly layout: SignalLayout;
}

interface RenderClipInput {
  readonly clients: readonly [SignalClient, ...SignalClient[]];
  readonly frames: FrameReader;
  readonly width: number;
  readonly height: number;
  readonly sources: Uint32Array;
  readonly settings: SignalSettings;
  readonly store: FrameStore;
  readonly signal: AbortSignal;
  readonly onProgress: (done: number, total: number) => void;
}

const layoutOf = (image: PackedSignalImage): SignalLayout => ({
  width: image.width,
  height: image.height,
  sampleAspect: image.sampleAspect,
  frameCount: image.frameCount
});

type Batch = readonly [PackedSignalImage, ...PackedSignalImage[]];

const renderBatch = async (
  input: RenderClipInput,
  cycle: number,
  start: number
): Promise<Batch> => {
  input.signal.throwIfAborted();
  const renderField = async (lane: number): Promise<PackedSignalImage> => {
    const field = start + lane;
    const native = await readNative({ ...input, field });
    const image = await cyclic(input.clients, lane).render([toRgbFrame(native, 1)], {
      ...input.settings,
      frameView: FrameView.Single,
      frameIndex: field % cycle
    });
    return packSignalImage(image);
  };
  const count = Math.min(input.clients.length, input.sources.length - start);
  const [head, rest] = await Promise.all([
    renderField(0),
    Promise.all(Array.from({ length: count - 1 }, (_, lane) => renderField(lane + 1)))
  ]);
  return [head, ...rest];
};

const store = async (input: RenderClipInput, batch: Batch, done: number): Promise<void> => {
  await batch.reduce(async (written, image) => {
    await written;
    await input.store.append(image.data);
  }, Promise.resolve());
  input.onProgress(done, input.sources.length);
};

export const renderClip = async (input: RenderClipInput): Promise<RenderedClip> => {
  const cycle = frameCycle({
    timing: resolveTiming(input.settings),
    scan: input.settings.scan,
    sourceFrames: 1
  });
  const lanes = input.clients.length;
  const first = await renderBatch(input, cycle, 0);
  await store(input, first, first.length);
  const starts = Array.from(
    { length: Math.ceil(input.sources.length / lanes) - 1 },
    (_, batch) => (batch + 1) * lanes
  );
  await starts.reduce(async (previous, start) => {
    await previous;
    const batch = await renderBatch(input, cycle, start);
    await store(input, batch, start + batch.length);
  }, Promise.resolve());
  return {
    fields: await input.store.seal(first[0].data.length),
    layout: layoutOf(first[0])
  };
};
