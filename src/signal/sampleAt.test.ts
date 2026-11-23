import { describe, expect, it } from 'vitest';

import { sampleAt } from './sampleAt';

describe('sampleAt', () => {
  it('reads a sample inside the array', () => {
    // Arrange
    const samples = Float64Array.from([0.25, 0.75]);

    // Act
    const value = sampleAt(samples, 1);

    // Assert
    expect(value).toBe(0.75);
  });

  it('reads black outside the array', () => {
    // Arrange
    const samples = Float32Array.from([0.25]);

    // Act
    const value = sampleAt(samples, -1);

    // Assert
    expect(value).toBe(0);
  });
});
