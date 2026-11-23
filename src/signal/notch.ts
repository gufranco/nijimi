import { filtfilt } from './filtfilt';

const TRAP_Q = 1;

export const notch = (
  input: Float64Array,
  centreHz: number,
  sampleRateHz: number
): Float64Array => {
  const omega = (2 * Math.PI * centreHz) / sampleRateHz;
  const alpha = Math.sin(omega) / (2 * TRAP_Q);
  const cos = Math.cos(omega);
  const a0 = 1 + alpha;
  return filtfilt(input, {
    b0: 1 / a0,
    b1: (-2 * cos) / a0,
    b2: 1 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0
  });
};
