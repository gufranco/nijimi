import { describe, expect, it } from 'vitest';

import { bayerMatrix } from './bayerMatrix';

describe('bayerMatrix', () => {
  it('builds the classic 2x2 index matrix', () => {
    // Arrange
    const order = 2;

    // Act
    const matrix = bayerMatrix(order);

    // Assert
    expect(matrix).toEqual([
      [0, 2],
      [3, 1]
    ]);
  });

  it('builds the classic 4x4 index matrix', () => {
    // Arrange
    const order = 4;

    // Act
    const matrix = bayerMatrix(order);

    // Assert
    expect(matrix).toEqual([
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ]);
  });

  it('holds every rank once in the 8x8 matrix', () => {
    // Arrange
    const order = 8;

    // Act
    const matrix = bayerMatrix(order);

    // Assert
    expect(matrix.flat().toSorted((a, b) => a - b)).toEqual(
      Array.from({ length: 64 }, (_, index) => index)
    );
  });
});
