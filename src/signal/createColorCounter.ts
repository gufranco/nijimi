import { sampleAt } from './sampleAt';
import type { ColorStats, RgbFrame } from './types';

const RGB = 3;
const MAX_BYTE = 255;
const LEVELS = 256;
const COLOR_SPACE = 2 ** 24;
const BITS_PER_WORD = 32;
const WORD_SHIFT = 5;
const WORD_MASK = 31;
const RED_SHIFT = 16;
const GREEN_SHIFT = 8;

export interface ColorCounter {
  readonly add: (frame: RgbFrame) => void;
  readonly stats: () => ColorStats;
  readonly presence: () => Uint32Array;
}

interface PixelTables {
  readonly seen: Uint32Array;
  readonly red: Uint8Array;
  readonly green: Uint8Array;
  readonly blue: Uint8Array;
}

const byteAt = (data: Float32Array, index: number): number =>
  Math.round(Math.min(1, Math.max(0, sampleAt(data, index))) * MAX_BYTE);

const mark = (table: Uint8Array, level: number): void => {
  table.fill(1, level, level + 1);
};

const usedLevels = (table: Uint8Array): number => table.reduce((sum, used) => sum + used, 0);

const recordNew = (tables: PixelTables, r: number, g: number, b: number): number => {
  const packed = (r << RED_SHIFT) | (g << GREEN_SHIFT) | b;
  const word = packed >>> WORD_SHIFT;
  const bit = 1 << (packed & WORD_MASK);
  const current = sampleAt(tables.seen, word);
  if ((current & bit) !== 0) {
    return 0;
  }
  tables.seen.fill(current | bit, word, word + 1);
  mark(tables.red, r);
  mark(tables.green, g);
  mark(tables.blue, b);
  return 1;
};

export const createColorCounter = (): ColorCounter => {
  const tables: PixelTables = {
    seen: new Uint32Array(COLOR_SPACE / BITS_PER_WORD),
    red: new Uint8Array(LEVELS),
    green: new Uint8Array(LEVELS),
    blue: new Uint8Array(LEVELS)
  };
  let colors = 0;
  return {
    add: (frame) => {
      const pixels = frame.width * frame.height;
      for (let pixel = 0; pixel < pixels; pixel += 1) {
        const offset = pixel * RGB;
        colors += recordNew(
          tables,
          byteAt(frame.data, offset),
          byteAt(frame.data, offset + 1),
          byteAt(frame.data, offset + 2)
        );
      }
    },
    presence: () => tables.seen.slice(),
    stats: () => ({
      colors,
      levels: Math.max(usedLevels(tables.red), usedLevels(tables.green), usedLevels(tables.blue))
    })
  };
};
