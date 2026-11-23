import { describe, expect, it } from 'vitest';

import { PalDecoding } from './palDecoding';

describe('PalDecoding', () => {
  it('keeps the PAL decoder values that shared links carry', () => {
    // Arrange
    const expected = ['simple', 'delay-line'];

    // Act
    const values = Object.values(PalDecoding);

    // Assert
    expect(values).toEqual(expected);
  });
});
