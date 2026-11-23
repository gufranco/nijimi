import { describe, expect, it } from 'vitest';

import { fieldCount } from './fieldCount';

describe('fieldCount', () => {
  it.each([
    [0.2, 59.922751, 11],
    [8, 59.922751, 479],
    [0, 60, 1]
  ])('gives a %s s clip at %s Hz %s fields, at least one', (duration, rate, expected) => {
    // Arrange
    const input = { duration, rate };

    // Act
    const count = fieldCount(input.duration, input.rate);

    // Assert
    expect(count).toBe(expected);
  });
});
