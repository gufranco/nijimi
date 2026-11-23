import { describe, expect, it } from 'vitest';

import { rowPixels } from './rowPixels';

describe('rowPixels', () => {
  it('views one row of an interleaved RGB frame', () => {
    // Arrange
    const frame = {
      width: 2,
      height: 2,
      data: Float32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    };

    // Act
    const row = rowPixels(frame, 1);

    // Assert
    expect(Array.from(row)).toEqual([7, 8, 9, 10, 11, 12]);
  });
});
