import { describe, expect, it } from 'vitest';

import { palDelayLine } from './palDelayLine';
import type { YuvRow } from './types';

const row = (y: number, u: number, v: number): YuvRow => ({
  y: Float64Array.from([y]),
  u: Float64Array.from([u]),
  v: Float64Array.from([v])
});

describe('palDelayLine', () => {
  it('averages U and V with the previous line and keeps luma', () => {
    // Arrange
    const current = row(0.5, 0.2, 0.4);
    const previous = row(0.9, 0.0, 0.2);

    // Act
    const output = palDelayLine(current, previous);

    // Assert
    expect(Array.from(output.y)).toEqual([0.5]);
    expect(output.u[0]).toBeCloseTo(0.1, 12);
    expect(output.v[0]).toBeCloseTo(0.3, 12);
  });

  it('keeps the line as it is when there is no previous line', () => {
    // Arrange
    const current = row(0.5, 0.2, 0.4);

    // Act
    const output = palDelayLine(current, null);

    // Assert
    expect(output).toBe(current);
  });
});
