import { filtfilt } from './filtfilt';
import type { Biquad } from './types';

const BUTTERWORTH_Q = Math.SQRT1_2;
const FILTFILT_HALF_POWER_RATIO = Math.pow(Math.SQRT2 - 1, 1 / 4);
const MAX_CUTOFF_OF_NYQUIST = 0.98;

const butterworth = (cutoffHz: number, sampleRateHz: number): Biquad => {
  const omega = (2 * Math.PI * cutoffHz) / sampleRateHz;
  const alpha = Math.sin(omega) / (2 * BUTTERWORTH_Q);
  const cos = Math.cos(omega);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0
  };
};

export const lowpass = (
  input: Float64Array,
  bandwidthHz: number,
  sampleRateHz: number
): Float64Array => {
  const cutoffHz = bandwidthHz / FILTFILT_HALF_POWER_RATIO;
  if (cutoffHz >= (sampleRateHz / 2) * MAX_CUTOFF_OF_NYQUIST) {
    return input.slice();
  }
  return filtfilt(input, butterworth(cutoffHz, sampleRateHz));
};
