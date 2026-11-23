import type { RgbFrame } from '../signal/types';
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
}

export type LoadResult =
  | { readonly ok: true; readonly value: LoadedImage }
  | {
      readonly ok: false;
      readonly error: InputError;
      readonly width: number;
      readonly height: number;
    };
