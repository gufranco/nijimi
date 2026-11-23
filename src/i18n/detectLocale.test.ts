import { describe, expect, it } from 'vitest';

import { detectLocale } from './detectLocale';
import { Locale } from './locale';

describe('detectLocale', () => {
  it.each([
    [['pt-BR', 'en-US'], Locale.PtBr],
    [['pt'], Locale.PtBr],
    [['pt-PT'], Locale.PtBr],
    [['en-GB', 'pt-BR'], Locale.En],
    [['ja-JP'], Locale.Ja],
    [['ja'], Locale.Ja],
    [['ko-KR', 'ja-JP'], Locale.Ja],
    [['ko-KR'], Locale.En],
    [[], Locale.En]
  ])('picks a locale for %j', (languages, expected) => {
    // Arrange
    const preferred = languages;

    // Act
    const locale = detectLocale(preferred);

    // Assert
    expect(locale).toBe(expected);
  });

  it('honours a saved choice over the browser languages', () => {
    // Arrange
    const preferred = ['en-US'];

    // Act
    const locale = detectLocale(preferred, 'pt-BR');

    // Assert
    expect(locale).toBe(Locale.PtBr);
  });

  it('ignores a saved choice that is not a supported locale', () => {
    // Arrange
    const preferred = ['pt-BR'];

    // Act
    const locale = detectLocale(preferred, 'xx');

    // Assert
    expect(locale).toBe(Locale.PtBr);
  });
});
