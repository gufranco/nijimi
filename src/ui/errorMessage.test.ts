import { describe, expect, it } from 'vitest';

import { InputError } from '../input/inputError';
import { errorMessage } from './errorMessage';

describe('errorMessage', () => {
  it.each([
    [InputError.NotPng, 'errorNotPng'],
    [InputError.FileTooBig, 'errorFileTooBig'],
    [InputError.TooLarge, 'errorTooLarge'],
    [InputError.Corrupt, 'errorCorrupt']
  ])('maps %s to the %s message', (error, key) => {
    // Arrange
    const input = error;

    // Act
    const message = errorMessage(input);

    // Assert
    expect(message).toBe(key);
  });
});
