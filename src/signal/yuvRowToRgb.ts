import { BT601 } from './bt601';
import { interleave } from './interleave';
import { sampleAt } from './sampleAt';
import type { YuvRow } from './types';

export const yuvRowToRgb = (row: YuvRow, saturation: number): Float32Array => {
  const red = row.y.map((y, n) => y + (saturation * sampleAt(row.v, n)) / BT601.vScale);
  const blue = row.y.map((y, n) => y + (saturation * sampleAt(row.u, n)) / BT601.uScale);
  const green = row.y.map(
    (y, n) => (y - BT601.kr * sampleAt(red, n) - BT601.kb * sampleAt(blue, n)) / BT601.kg
  );
  return interleave(red, green, blue);
};
