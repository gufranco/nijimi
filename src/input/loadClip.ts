import { createAppendLog } from '../clip/createAppendLog';
import type { FrameStore } from '../clip/types';
import type { Logger } from '../logging/createLogger';
import { createColorCounter } from '../signal/createColorCounter';
import { chooseScale } from './chooseScale';
import { InputError } from './inputError';
import { INPUT_LIMITS } from './inputLimits';
import { nativeRgba } from './nativeRgba';
import { toRgbFrame } from './toRgbFrame';
import type { ClipResult, ClipSource, InputResult, LoadedClip, RgbaImage } from './types';

const RGBA = 4;

interface LoadClipInput {
  readonly source: ClipSource;
  readonly scaleOverride: number;
  readonly store: FrameStore;
  readonly onProgress: (decoded: number) => void;
  readonly logger: Logger;
}

interface Shape {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly detected: number;
  readonly first: RgbaImage;
}

const refuse = <T>(error: InputError, width: number, height: number): InputResult<T> => ({
  ok: false,
  error,
  width,
  height
});

const measure = (frame: RgbaImage, override: number): InputResult<Shape> => {
  if (frame.width > INPUT_LIMITS.maxFileSide || frame.height > INPUT_LIMITS.maxFileSide) {
    return refuse(InputError.TooLarge, frame.width, frame.height);
  }
  const { scale, detected } = chooseScale(frame, override);
  const width = frame.width / scale;
  const height = frame.height / scale;
  if (width > INPUT_LIMITS.maxNativeSide || height > INPUT_LIMITS.maxNativeSide) {
    return refuse(InputError.TooLarge, width, height);
  }
  return { ok: true, value: { width, height, scale, detected, first: nativeRgba(frame, scale) } };
};

const decodeClip = async (input: LoadClipInput): Promise<ClipResult> => {
  const counter = createColorCounter();
  const times = createAppendLog<number>();
  let shape: Shape | null = null;
  let refusal: ClipResult | null = null;
  let decoded = 0;
  const visit = async (frame: RgbaImage, seconds: number): Promise<boolean> => {
    const measured =
      shape === null ? measure(frame, input.scaleOverride) : { ok: true as const, value: shape };
    if (!measured.ok) {
      refusal = measured;
      return false;
    }
    const { value } = measured;
    if (frame.width !== value.width * value.scale || frame.height !== value.height * value.scale) {
      refusal = refuse(InputError.Corrupt, frame.width, frame.height);
      return false;
    }
    shape = value;
    const native = nativeRgba(frame, value.scale);
    counter.add(toRgbFrame(native, 1));
    await input.store.append(native.data);
    times.append(seconds);
    decoded += 1;
    input.onProgress(decoded);
    return true;
  };
  const outcome = (): { readonly found: Shape | null; readonly refused: ClipResult | null } => ({
    found: shape,
    refused: refusal
  });
  const duration = await input.source.each(visit);
  const { found, refused } = outcome();
  const frames = await input.store.seal(found === null ? RGBA : found.width * found.height * RGBA);
  if (refused !== null || found === null) {
    await frames.discard();
    return refused ?? refuse(InputError.Corrupt, 0, 0);
  }
  return {
    ok: true,
    value: {
      image: {
        frame: toRgbFrame(found.first, 1),
        scale: found.scale,
        detectedScale: found.detected,
        stats: counter.stats()
      },
      frames,
      times: times.items(),
      duration
    }
  };
};

export const loadClip = async (input: LoadClipInput): Promise<ClipResult> => {
  const result = await decodeClip(input).catch((error: unknown) => {
    input.logger.error({ err: error }, 'clip decoding failed, refusing the clip as corrupt');
    return refuse<LoadedClip>(InputError.Corrupt, 0, 0);
  });
  input.source.close();
  return result;
};
