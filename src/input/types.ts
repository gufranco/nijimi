import type { FrameReader } from '../clip/types';
import type { ColorStats, RgbFrame } from '../signal/types';
import type { InputError } from './inputError';

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

export interface LoadedImage {
  readonly frame: RgbFrame;
  readonly scale: number;
  readonly detectedScale: number;
  readonly stats: ColorStats;
  readonly presence: Uint32Array | null;
}

export type InputResult<T> =
  | { readonly ok: true; readonly value: T }
  | {
      readonly ok: false;
      readonly error: InputError;
      readonly width: number;
      readonly height: number;
    };

export type LoadResult = InputResult<LoadedImage>;

export type VisitFrame = (frame: RgbaImage, seconds: number) => Promise<boolean>;

export interface ClipSource {
  readonly lossy: boolean;
  readonly each: (visit: VisitFrame) => Promise<number>;
  readonly close: () => void;
}

export interface LoadedClip {
  readonly image: LoadedImage;
  readonly frames: FrameReader;
  readonly times: readonly number[];
  readonly duration: number;
}

export type ClipResult = InputResult<LoadedClip>;
