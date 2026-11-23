import { describe, expect, it } from 'vitest';

import { toError } from './toError';

describe('toError', () => {
  it('keeps an Error as it is', () => {
    // Arrange
    const error = new RangeError('out of range');

    // Act
    const result = toError(error);

    // Assert
    expect(result).toBe(error);
  });

  it('wraps any other thrown value with its text', () => {
    // Arrange
    const thrown = 'plain text';

    // Act
    const result = toError(thrown);

    // Assert
    expect(result.message).toBe('plain text');
    expect(result.cause).toBe(thrown);
  });
});
