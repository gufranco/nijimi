import { describe, expect, it } from 'vitest';

import { notch } from './notch';

const SUBCARRIER_HZ = 315e6 / 88;
const SAMPLE_RATE_HZ = 4 * SUBCARRIER_HZ;
const LENGTH = 4096;

const sine = (frequencyHz: number): Float64Array =>
  Float64Array.from({ length: LENGTH }, (_, n) =>
    Math.sin((2 * Math.PI * frequencyHz * n) / SAMPLE_RATE_HZ)
  );

const centreAmplitude = (signal: Float64Array): number =>
  signal
    .slice(LENGTH / 4, (3 * LENGTH) / 4)
    .reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);

const analogNotchGain = (ratio: number): number => {
  const numerator = Math.abs(1 - ratio * ratio);
  return numerator / Math.hypot(1 - ratio * ratio, ratio);
};

describe('notch', () => {
  it('removes a tone at the subcarrier', () => {
    // Arrange
    const input = sine(SUBCARRIER_HZ);

    // Act
    const output = notch(input, SUBCARRIER_HZ, SAMPLE_RATE_HZ);

    // Assert
    expect(centreAmplitude(output)).toBeLessThan(0.01);
  });

  it('passes a constant level unchanged', () => {
    // Arrange
    const level = new Float64Array(32).fill(0.7);

    // Act
    const output = notch(level, SUBCARRIER_HZ, SAMPLE_RATE_HZ);

    // Assert
    output.forEach((value) => {
      expect(value).toBeCloseTo(0.7, 9);
    });
  });

  it('matches the squared analog Q=1 notch at a quarter of the subcarrier', () => {
    // Arrange
    const input = sine(SUBCARRIER_HZ / 4);
    const expected = analogNotchGain(0.25) ** 2;

    // Act
    const output = notch(input, SUBCARRIER_HZ, SAMPLE_RATE_HZ);

    // Assert
    expect(centreAmplitude(output)).toBeGreaterThan(expected - 0.03);
    expect(centreAmplitude(output)).toBeLessThan(expected + 0.03);
  });
});
