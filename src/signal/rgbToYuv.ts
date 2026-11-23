import { BT601 } from './bt601';

export const rgbToYuv = (r: number, g: number, b: number): readonly [number, number, number] => {
  const y = BT601.kr * r + BT601.kg * g + BT601.kb * b;
  return [y, BT601.uScale * (b - y), BT601.vScale * (r - y)];
};
