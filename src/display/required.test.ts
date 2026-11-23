import { describe, expect, it } from 'vitest';

import { required } from './required';

describe('required', () => {
  it('returns a present value', () => {
    // Arrange
    const value = { id: 1 };

    // Act
    const result = required(value, 'buffer');

    // Assert
    expect(result).toBe(value);
  });

  it('throws naming what was missing', () => {
    // Arrange
    const value = null;

    // Act
    const read = (): unknown => required(value, 'vertex shader');

    // Assert
    expect(read).toThrow('vertex shader is unavailable');
  });
});
