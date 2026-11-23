import { describe, expect, it } from 'vitest';

import { Separation } from './separation';

describe('Separation', () => {
  it('keeps the separation values that shared links carry', () => {
    // Arrange
    const expected = ['notch', 'comb1', 'comb2'];

    // Act
    const values = Object.values(Separation);

    // Assert
    expect(values).toEqual(expected);
  });
});
