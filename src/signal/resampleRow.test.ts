import { describe, expect, it } from 'vitest';

import { resampleRow } from './resampleRow';

describe('resampleRow', () => {
  it('holds each pixel for two samples at two samples per pixel', () => {
    // Arrange
    const pixels = Float64Array.from([0.2, 0.8]);

    // Act
    const samples = resampleRow(pixels, 2);

    // Assert
    expect(Array.from(samples)).toEqual([0.2, 0.2, 0.8, 0.8]);
  });

  it('area-weights a sample that straddles two pixels', () => {
    // Arrange
    const pixels = Float64Array.from([0, 1, 0]);

    // Act
    const samples = resampleRow(pixels, 1.5);

    // Assert
    expect(samples).toHaveLength(5);
    expect(samples[0]).toBeCloseTo(0, 12);
    expect(samples[1]).toBeCloseTo(0.5, 12);
    expect(samples[2]).toBeCloseTo(1, 12);
    expect(samples[3]).toBeCloseTo(0, 12);
    expect(samples[4]).toBeCloseTo(0, 12);
  });

  it('averages the covered part of a final partial sample', () => {
    // Arrange
    const pixels = Float64Array.from([0.6]);

    // Act
    const samples = resampleRow(pixels, 2.5);

    // Assert
    expect(Array.from(samples)).toEqual([0.6, 0.6, 0.6]);
  });

  it('preserves the mean level of the row', () => {
    // Arrange
    const pixels = Float64Array.from([0.1, 0.9, 0.3, 0.7, 0.5, 0.2]);

    // Act
    const samples = resampleRow(pixels, 8 / 3);

    // Assert
    const meanIn = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
    const meanOut = samples.reduce((sum, value) => sum + value, 0) / samples.length;
    expect(meanOut).toBeCloseTo(meanIn, 6);
  });
});
