import { describe, expect, it } from 'vitest';

import { filtfilt } from './filtfilt';

const SMOOTHING = { b0: 0.25, b1: 0.5, b2: 0.25, a1: -0.2, a2: 0.1 };

describe('filtfilt', () => {
  it('returns the input for the identity section', () => {
    // Arrange
    const input = Float64Array.from([0.1, 0.9, 0.4, 0.3]);

    // Act
    const output = filtfilt(input, { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 });

    // Assert
    expect(Array.from(output)).toEqual([0.1, 0.9, 0.4, 0.3]);
  });

  it('responds symmetrically around an impulse, so it adds no delay', () => {
    // Arrange
    const input = new Float64Array(65);
    input[32] = 1;

    // Act
    const output = filtfilt(input, SMOOTHING);

    // Assert
    Array.from({ length: 20 }, (_, offset) => offset + 1).forEach((offset) => {
      expect(output[32 - offset]).toBeCloseTo(output[32 + offset] ?? Number.NaN, 12);
    });
  });

  it('returns an empty signal for an empty input', () => {
    // Arrange
    const input = new Float64Array(0);

    // Act
    const output = filtfilt(input, SMOOTHING);

    // Assert
    expect(output).toHaveLength(0);
  });
});
