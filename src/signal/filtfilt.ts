import type { Biquad } from './types';
import { sampleAt } from './sampleAt';

const forward = (input: Float64Array, section: Biquad): Float64Array => {
  const first = sampleAt(input, 0);
  const dcGain = (section.b0 + section.b1 + section.b2) / (1 + section.a1 + section.a2);
  const settled = dcGain * first;
  let z2 = section.b2 * first - section.a2 * settled;
  let z1 = section.b1 * first - section.a1 * settled + z2;
  return input.map((x) => {
    const y = section.b0 * x + z1;
    z1 = section.b1 * x - section.a1 * y + z2;
    z2 = section.b2 * x - section.a2 * y;
    return y;
  });
};

export const filtfilt = (input: Float64Array, section: Biquad): Float64Array =>
  forward(forward(input, section).reverse(), section).reverse();
