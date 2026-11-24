import { createAppendLog } from '../clip/createAppendLog';
import type { FrameStore } from '../clip/types';
import type { Logger } from '../logging/createLogger';
import type { ConsolePreset } from '../signal/consolePreset';
import { createColorCounter } from '../signal/createColorCounter';
import type { VideoStandard } from '../signal/videoStandard';
import { chooseScale } from './chooseScale';
import { InputError } from './inputError';
import { INPUT_LIMITS } from './inputLimits';
import { lossyScale } from './lossyScale';
import { nativeRgba } from './nativeRgba';
import { toRgbFrame } from './toRgbFrame';
import type { ClipResult, ClipSource, InputResult, LoadedClip, RgbaImage } from './types';

const RGBA = 4;

interface LoadClipInput {
  readonly source: ClipSource;
  readonly scaleOverride: number;
  readonly preset: ConsolePreset;
  readonly standard: VideoStandard;
  readonly store: FrameStore;
  readonly onProgress: (decoded: number) => void;
  readonly logger: Logger;
}

interface Shape {
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly detected: number;
  readonly phase: number;
  readonly first: RgbaImage;
}

const refuse = <T>(error: InputError, width: number, height: number): InputResult<T> => ({
  ok: false,
  error,
  width,
  height
});

const pickScale = (
  frame: RgbaImage,
  input: LoadClipInput
): { readonly scale: number; readonly detected: number } => {
  const chosen = chooseScale(frame, input.scaleOverride);
  if (!input.source.lossy || chosen.scale !== 1 || input.scaleOverride !== 0) {
    return chosen;
  }
  const scale = lossyScale({ ...input, width: frame.width, height: frame.height });
  return { scale, detected: scale };
};

const measure = (frame: RgbaImage, input: LoadClipInput): InputResult<Shape> => {
  if (frame.width > INPUT_LIMITS.maxFileSide || frame.height > INPUT_LIMITS.maxFileSide) {
    return refuse(InputError.TooLarge, frame.width, frame.height);
  }
  const { scale, detected } = pickScale(frame, input);
  const width = frame.width / scale;
  const height = frame.height / scale;
  if (width > INPUT_LIMITS.maxNativeSide || height > INPUT_LIMITS.maxNativeSide) {
    return refuse(InputError.TooLarge, width, height);
  }
  const phase = input.source.lossy ? Math.floor(scale / 2) : 0;
  return {
    ok: true,
    value: { width, height, scale, detected, phase, first: nativeRgba(frame, scale, phase) }
  };
};

const decodeClip = async (input: LoadClipInput): Promise<ClipResult> => {
  const counter = createColorCounter();
  const times = createAppendLog<number>();
  let shape: Shape | null = null;
  let refusal: ClipResult | null = null;
  let decoded = 0;
  const visit = async (frame: RgbaImage, seconds: number): Promise<boolean> => {
    const measured = shape === null ? measure(frame, input) : { ok: true as const, value: shape };
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
    const native = nativeRgba(frame, value.scale, value.phase);
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
        stats: counter.stats(),
        presence: input.source.lossy ? counter.presence() : null
      },
      frames,
      times: times.items(),
      duration,
      audio: input.source.hasAudio()
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
