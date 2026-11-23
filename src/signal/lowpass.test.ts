import { describe, expect, it } from 'vitest';

import { lowpass } from './lowpass';

const SAMPLE_RATE_HZ = 4 * (315e6 / 88);
const LENGTH = 4096;

const sine = (frequencyHz: number): Float64Array =>
  Float64Array.from({ length: LENGTH }, (_, n) =>
    Math.sin((2 * Math.PI * frequencyHz * n) / SAMPLE_RATE_HZ)
  );

const centreAmplitude = (signal: Float64Array): number =>
  signal
    .slice(LENGTH / 4, (3 * LENGTH) / 4)
    .reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);

describe('lowpass', () => {
  it('passes a constant level unchanged from the first sample', () => {
    // Arrange
    const level = new Float64Array(64).fill(0.42);

    // Act
    const output = lowpass(level, 1.3e6, SAMPLE_RATE_HZ);

    // Assert
    output.forEach((value) => {
      expect(value).toBeCloseTo(0.42, 9);
    });
  });

  it('is 3 dB down at the stated bandwidth', () => {
    // Arrange
    const input = sine(1.3e6);

    // Act
    const output = lowpass(input, 1.3e6, SAMPLE_RATE_HZ);

    // Assert
    expect(centreAmplitude(output)).toBeGreaterThan(Math.SQRT1_2 * 0.95);
    expect(centreAmplitude(output)).toBeLessThan(Math.SQRT1_2 * 1.05);
  });

  it('passes a tone at a quarter of the bandwidth almost unchanged', () => {
    // Arrange
    const input = sine(0.325e6);

    // Act
    const output = lowpass(input, 1.3e6, SAMPLE_RATE_HZ);

    // Assert
    expect(centreAmplitude(output)).toBeGreaterThan(0.98);
  });

  it('rejects a tone at three times the bandwidth', () => {
    // Arrange
    const input = sine(3.9e6);

    // Act
    const output = lowpass(input, 1.3e6, SAMPLE_RATE_HZ);

    // Assert
    expect(centreAmplitude(output)).toBeLessThan(0.05);
  });

  it('returns an unfiltered copy when the bandwidth reaches the Nyquist limit', () => {
    // Arrange
    const input = sine(5e6);

    // Act
    const output = lowpass(input, 6.75e6, SAMPLE_RATE_HZ);

    // Assert
    expect(Array.from(output)).toEqual(Array.from(input));
    expect(output).not.toBe(input);
  });

  it('leaves the input array untouched', () => {
    // Arrange
    const input = sine(2e6);
    const before = Array.from(input);

    // Act
    lowpass(input, 1.3e6, SAMPLE_RATE_HZ);

    // Assert
    expect(Array.from(input)).toEqual(before);
  });
});
