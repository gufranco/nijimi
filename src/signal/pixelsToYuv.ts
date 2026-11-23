import { BT601 } from './bt601';
import { sampleAt } from './sampleAt';
import type { YuvRow } from './types';

const CHANNELS = 3;

export const pixelsToYuv = (pixels: Float32Array): YuvRow => {
  const count = pixels.length / CHANNELS;
  const channel = (index: number, offset: number): number =>
    sampleAt(pixels, index * CHANNELS + offset);
  const y = Float64Array.from(
    { length: count },
    (_, index) =>
      BT601.kr * channel(index, 0) + BT601.kg * channel(index, 1) + BT601.kb * channel(index, 2)
  );
  return {
    y,
    u: y.map((luma, index) => BT601.uScale * (channel(index, 2) - luma)),
    v: y.map((luma, index) => BT601.vScale * (channel(index, 0) - luma))
  };
};
