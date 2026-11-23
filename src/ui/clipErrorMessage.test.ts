import { describe, expect, it } from 'vitest';

import { InputError } from '../input/inputError';
import { clipErrorMessage } from './clipErrorMessage';

describe('clipErrorMessage', () => {
  it.each([
    [InputError.NotPng, 'errorUnsupportedClip'],
    [InputError.UnsupportedClip, 'errorUnsupportedClip'],
    [InputError.FileTooBig, 'errorClipCorrupt'],
    [InputError.TooLarge, 'errorClipTooLarge'],
    [InputError.Corrupt, 'errorClipCorrupt']
  ])('maps %s to the %s message', (error, key) => {
    // Arrange
    const input = error;

    // Act
    const message = clipErrorMessage(input);

    // Assert
    expect(message).toBe(key);
  });
});
