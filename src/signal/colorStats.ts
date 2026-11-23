import { createColorCounter } from './createColorCounter';
import type { ColorStats, RgbFrame } from './types';

export const colorStats = (frame: RgbFrame): ColorStats => {
  const counter = createColorCounter();
  counter.add(frame);
  return counter.stats();
};
