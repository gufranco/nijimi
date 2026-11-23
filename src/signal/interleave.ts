import { sampleAt } from './sampleAt';

const CHANNELS = 3;

export const interleave = (
  red: Float64Array,
  green: Float64Array,
  blue: Float64Array
): Float32Array =>
  Float32Array.from({ length: red.length * CHANNELS }, (_, index) => {
    const channel = index % CHANNELS;
    const source = channel === 0 ? red : channel === 1 ? green : blue;
    return sampleAt(source, Math.floor(index / CHANNELS));
  });
