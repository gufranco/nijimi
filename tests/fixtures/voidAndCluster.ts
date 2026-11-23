import { faker } from '@faker-js/faker';

const SIGMA = 1.5;
const INITIAL_FRACTION = 0.1;

type Pattern = readonly boolean[];

const energyAt = (pattern: Pattern, size: number, index: number): number =>
  pattern.reduce((sum, on, other) => {
    if (!on) {
      return sum;
    }
    const dx = Math.abs((index % size) - (other % size));
    const dy = Math.abs(Math.floor(index / size) - Math.floor(other / size));
    const distanceSquared = Math.min(dx, size - dx) ** 2 + Math.min(dy, size - dy) ** 2;
    return sum + Math.exp(-distanceSquared / (2 * SIGMA * SIGMA));
  }, 0);

const extreme = (pattern: Pattern, size: number, wantOn: boolean, pickMax: boolean): number => {
  const scored = pattern.flatMap((on, index) =>
    on === wantOn ? [{ index, energy: energyAt(pattern, size, index) }] : []
  );
  const best = scored.reduce((a, b) =>
    (pickMax ? b.energy > a.energy : b.energy < a.energy) ? b : a
  );
  return best.index;
};

const settle = (pattern: Pattern, size: number): Pattern =>
  Array.from({ length: size * size }).reduce<{ pattern: Pattern; done: boolean }>(
    (state) => {
      if (state.done) {
        return state;
      }
      const cluster = extreme(state.pattern, size, true, true);
      const removed = state.pattern.with(cluster, false);
      const hole = extreme(removed, size, false, false);
      return hole === cluster
        ? { pattern: state.pattern, done: true }
        : { pattern: removed.with(hole, true), done: false };
    },
    { pattern, done: false }
  ).pattern;

const rankDown = (pattern: Pattern, size: number, ranks: readonly number[]): readonly number[] => {
  const ones = pattern.filter(Boolean).length;
  return Array.from({ length: ones }).reduce<{ pattern: Pattern; ranks: readonly number[] }>(
    (state, _, step) => {
      const cluster = extreme(state.pattern, size, true, true);
      return {
        pattern: state.pattern.with(cluster, false),
        ranks: state.ranks.with(cluster, ones - 1 - step)
      };
    },
    { pattern, ranks }
  ).ranks;
};

const rankUp = (pattern: Pattern, size: number, ranks: readonly number[]): readonly number[] => {
  const ones = pattern.filter(Boolean).length;
  return Array.from({ length: size * size - ones }).reduce<{
    pattern: Pattern;
    ranks: readonly number[];
  }>(
    (state, _, step) => {
      const hole = extreme(state.pattern, size, false, false);
      return {
        pattern: state.pattern.with(hole, true),
        ranks: state.ranks.with(hole, ones + step)
      };
    },
    { pattern, ranks }
  ).ranks;
};

export const voidAndCluster = (size: number, seed: number): Uint16Array => {
  faker.seed(seed);
  const cells = size * size;
  const picked = new Set(
    faker.helpers.arrayElements(
      Array.from({ length: cells }, (_, index) => index),
      Math.max(2, Math.round(cells * INITIAL_FRACTION))
    )
  );
  const initial = settle(
    Array.from({ length: cells }, (_, index) => picked.has(index)),
    size
  );
  const blank: readonly number[] = Array.from({ length: cells }, () => 0);
  return Uint16Array.from(rankUp(initial, size, rankDown(initial, size, blank)));
};
