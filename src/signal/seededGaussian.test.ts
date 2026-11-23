import { describe, expect, it } from 'vitest';

import { seededGaussian } from './seededGaussian';

describe('seededGaussian', () => {
  it('repeats the same sequence for the same seed', () => {
    // Arrange
    const seed = 1234;

    // Act
    const first = seededGaussian(seed, 64);

    // Assert
    expect(Array.from(first)).toEqual(Array.from(seededGaussian(seed, 64)));
  });

  it('produces a different sequence for a different seed', () => {
    // Arrange
    const seed = 1234;

    // Act
    const first = seededGaussian(seed, 16);

    // Assert
    expect(Array.from(first)).not.toEqual(Array.from(seededGaussian(seed + 1, 16)));
  });

  it('has zero mean and unit variance over many samples', () => {
    // Arrange
    const count = 20_000;

    // Act
    const values = seededGaussian(99, count);

    // Assert
    const mean = values.reduce((sum, value) => sum + value, 0) / count;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / count;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(variance).toBeGreaterThan(0.95);
    expect(variance).toBeLessThan(1.05);
  });
});
