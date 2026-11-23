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

  it('scales U by 0.493 and V by 0.877, which rotated 33 degrees give the I and Q weights', () => {
    // Arrange
    const angle = (33 * Math.PI) / 180;

    // Act
    const iq = [
      -Math.sin(angle) * BT601.uScale,
      Math.cos(angle) * BT601.vScale,
      Math.cos(angle) * BT601.uScale,
      Math.sin(angle) * BT601.vScale
    ].map((weight) => Math.round(weight * 100) / 100);

    // Assert
    expect([BT601.uScale, BT601.vScale]).toEqual([0.493, 0.877]);
    expect(iq).toEqual([-0.27, 0.74, 0.41, 0.48]);
  });
});
