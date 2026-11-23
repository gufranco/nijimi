import { describe, expect, it } from 'vitest';

import { Locale } from './locale';

describe('Locale', () => {
  it('offers English, Brazilian Portuguese and Japanese by BCP 47 tag', () => {
    // Arrange
    const expected = ['en', 'pt-BR', 'ja'];

    // Act
    const values = Object.values(Locale);

    // Assert
    expect(values).toEqual(expected);
  });
});
