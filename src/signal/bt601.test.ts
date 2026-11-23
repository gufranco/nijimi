import { describe, expect, it } from 'vitest';

import { BT601 } from './bt601';

describe('BT601', () => {
  it('weights luma 0.299, 0.587, 0.114 and sums to one', () => {
    // Arrange
    const weights = [BT601.kr, BT601.kg, BT601.kb];

    // Act
    const total = weights.reduce((sum, weight) => sum + weight, 0);

    // Assert
    expect(weights).toEqual([0.299, 0.587, 0.114]);
    expect(total).toBeCloseTo(1, 12);
  });

  it('scales U and V so 100 percent bars stay inside 4/3 of white', () => {
    // Arrange
    const scales = [BT601.uScale, BT601.vScale];

    // Act
    const peaks = [scales[0] ?? 0, scales[1] ?? 0].map(
      (scale, index) => scale * (index === 0 ? 0.886 : 0.701)
    );

    // Assert
    expect(peaks[0]).toBeCloseTo(0.436, 3);
    expect(peaks[1]).toBeCloseTo(0.615, 3);
  });
});
