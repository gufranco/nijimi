import { describe, expect, it } from 'vitest';

import { CheckOutcome } from './checkOutcome';

describe('CheckOutcome', () => {
  it('orders the outcomes of a console check', () => {
    // Arrange
    const expected = ['pass', 'needs-mode', 'fail', 'not-applicable'];

    // Act
    const values = Object.values(CheckOutcome);

    // Assert
    expect(values).toEqual(expected);
  });
});
