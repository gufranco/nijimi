import { describe, expect, it } from 'vitest';

import { InputError } from './inputError';

describe('InputError', () => {
  it('names each way a file can be refused', () => {
    // Arrange
    const expected = ['not-png', 'file-too-big', 'too-large', 'corrupt'];

    // Act
    const values = Object.values(InputError);

    // Assert
    expect(values).toEqual(expected);
  });
});
