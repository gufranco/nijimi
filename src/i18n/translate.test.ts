import { describe, expect, it } from 'vitest';

import { Locale } from './locale';
import { translate } from './translate';

describe('translate', () => {
  it('fills placeholders in the chosen locale', () => {
    // Arrange
    const params = { width: '2048', height: '1536' };

    // Act
    const text = translate(Locale.PtBr, 'errorTooLarge', params);

    // Assert
    expect(text).toBe('Este PNG tem 2048 x 1536 na escala nativa. O limite é 1024 x 1024.');
  });

  it('fills placeholders in Japanese', () => {
    // Arrange
    const params = { scale: '4' };

    // Act
    const text = translate(Locale.Ja, 'scaleDetected', params);

    // Assert
    expect(text).toBe('4倍を検出');
  });

  it('leaves an unknown placeholder as written', () => {
    // Arrange
    const params = { scale: '4' };

    // Act
    const text = translate(Locale.En, 'nativeSize', params);

    // Assert
    expect(text).toBe('{width} x {height} native');
  });

  it('returns a message with no placeholders unchanged', () => {
    // Arrange
    const key = 'choosePng';

    // Act
    const text = translate(Locale.En, key);

    // Assert
    expect(text).toBe('Choose PNG');
  });
});
