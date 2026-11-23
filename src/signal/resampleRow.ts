import { sampleAt } from './sampleAt';

const EDGE_EPSILON = 1e-9;

const sampleValue = (
  pixels: Float64Array,
  samplesPerPixel: number,
  start: number,
  end: number
): number => {
  const first = Math.floor(start / samplesPerPixel);
  const last = Math.min(pixels.length - 1, Math.ceil(end / samplesPerPixel) - 1);
  let weighted = 0;
  for (let index = first; index <= last; index += 1) {
    const overlap =
      Math.min(end, (index + 1) * samplesPerPixel) - Math.max(start, index * samplesPerPixel);
    weighted += Math.max(0, overlap) * sampleAt(pixels, index);
  }
  return weighted / (end - start);
};

export const resampleRow = (pixels: Float64Array, samplesPerPixel: number): Float64Array => {
  const total = pixels.length * samplesPerPixel;
  return Float64Array.from({ length: Math.ceil(total - EDGE_EPSILON) }, (_, n) =>
    sampleValue(pixels, samplesPerPixel, n, Math.min(n + 1, total))
  );
};
