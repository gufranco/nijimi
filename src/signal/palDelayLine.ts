import type { YuvRow } from './types';
import { sampleAt } from './sampleAt';

export const palDelayLine = (current: YuvRow, previous: YuvRow | null): YuvRow => {
  if (previous === null) {
    return current;
  }
  return {
    y: current.y,
    u: current.u.map((value, n) => (value + sampleAt(previous.u, n)) / 2),
    v: current.v.map((value, n) => (value + sampleAt(previous.v, n)) / 2)
  };
};
