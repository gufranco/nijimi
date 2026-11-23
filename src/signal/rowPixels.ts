import type { RgbFrame } from './types';

const CHANNELS = 3;

export const rowPixels = (frame: RgbFrame, row: number): Float32Array =>
  frame.data.subarray(row * frame.width * CHANNELS, (row + 1) * frame.width * CHANNELS);
