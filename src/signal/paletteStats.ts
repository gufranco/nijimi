import type { ColorStats } from './types';

const BITS_PER_WORD = 32;
const MAX_BYTE = 255;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;
const BYTE_MASK = 0xff;

const snap = (value: number, levels: number): number =>
  Math.round((value * (levels - 1)) / MAX_BYTE);

const used = (table: Uint8Array): number => table.reduce((sum, mark) => sum + mark, 0);

export const paletteStats = (presence: Uint32Array, levels: number): ColorStats => {
  const seen = new Uint8Array(levels * levels * levels);
  const red = new Uint8Array(levels);
  const green = new Uint8Array(levels);
  const blue = new Uint8Array(levels);
  presence.forEach((word, index) => {
    for (let bit = 0; bit < BITS_PER_WORD && word !== 0; bit += 1) {
      if ((word >>> bit) & 1) {
        const packed = index * BITS_PER_WORD + bit;
        const r = snap((packed >>> RED_SHIFT) & BYTE_MASK, levels);
        const g = snap((packed >>> GREEN_SHIFT) & BYTE_MASK, levels);
        const b = snap(packed & BYTE_MASK, levels);
        const slot = (r * levels + g) * levels + b;
        seen.fill(1, slot, slot + 1);
        red.fill(1, r, r + 1);
        green.fill(1, g, g + 1);
        blue.fill(1, b, b + 1);
      }
    }
  });
  return {
    colors: used(seen),
    levels: Math.max(used(red), used(green), used(blue))
  };
};
