import { BT601 } from './bt601';

export const yuvToRgb = (y: number, u: number, v: number): readonly [number, number, number] => {
  const r = y + v / BT601.vScale;
  const b = y + u / BT601.uScale;
  return [r, (y - BT601.kr * r - BT601.kb * b) / BT601.kg, b];
};
