import { describe, expect, it } from 'vitest';

import { voidAndCluster } from './voidAndCluster';

const SIZE = 8;

const toroidalDistance = (a: number, b: number): number => {
  const dx = Math.abs((a % SIZE) - (b % SIZE));
  const dy = Math.abs(Math.floor(a / SIZE) - Math.floor(b / SIZE));
  return Math.hypot(Math.min(dx, SIZE - dx), Math.min(dy, SIZE - dy));
};

describe('voidAndCluster', () => {
  it('ranks every cell exactly once', () => {
    // Arrange
    const seed = 17;

    // Act
    const ranks = voidAndCluster(SIZE, seed);

    // Assert
    expect(Array.from(ranks).toSorted((a, b) => a - b)).toEqual(
      Array.from({ length: SIZE * SIZE }, (_, index) => index)
    );
  });

  it('spreads the darkest eighth of the cells at least two cells apart on average', () => {
    // Arrange
    const ranks = voidAndCluster(SIZE, 17);

    // Act
    const dots = Array.from(ranks.keys()).filter((index) => (ranks[index] ?? 0) < SIZE);

    // Assert
    const nearest = dots.map((dot) =>
      Math.min(
        ...dots.filter((other) => other !== dot).map((other) => toroidalDistance(dot, other))
      )
    );
    expect(
      nearest.reduce((sum, distance) => sum + distance, 0) / nearest.length
    ).toBeGreaterThanOrEqual(2);
  });
});
