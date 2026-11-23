import { describe, expect, it } from 'vitest';

import { Locale } from './locale';

describe('Locale', () => {
  it('offers English and Brazilian Portuguese by BCP 47 tag', () => {
    // Arrange
    const expected = ['en', 'pt-BR'];

    // Act
    const values = Object.values(Locale);

    // Assert
    expect(values).toEqual(expected);
  });
});
