import { describe, expect, it } from 'vitest';

import { demodulateChroma } from './demodulateChroma';

describe('demodulateChroma', () => {
  it('multiplies the chroma by twice the sine and cosine of the reference', () => {
    // Arrange
    const chroma = Float64Array.from([1, 1, 1, 1]);

    // Act
    const decoded = demodulateChroma({ chroma, cycles: 0, samplesPerCycle: 4, hueRadians: 0 });

    // Assert
    expect(Array.from(decoded.u).map((value) => Math.round(value * 1e9) / 1e9 + 0)).toEqual([
      0, 2, 0, -2
    ]);
    expect(Array.from(decoded.v).map((value) => Math.round(value * 1e9) / 1e9 + 0)).toEqual([
      2, 0, -2, 0
    ]);
  });
});
