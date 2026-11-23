import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { Connection } from '../signal/connection';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { parseHash } from './parseHash';
import { serializeHash } from './serializeHash';

describe('serializeHash', () => {
  it('writes only the settings that differ from the defaults', () => {
    // Arrange
    const settings = {
      ...DEFAULT_SETTINGS,
      signal: { ...DEFAULT_SETTINGS.signal, connection: Connection.Rgb }
    };

    // Act
    const hash = serializeHash(settings);

    // Assert
    expect(hash).toBe('#c=rgb');
  });

  it('writes an empty hash for the defaults', () => {
    // Arrange
    const settings = DEFAULT_SETTINGS;

    // Act
    const hash = serializeHash(settings);

    // Assert
    expect(hash).toBe('');
  });

  it('round-trips through parseHash', () => {
    // Arrange
    const settings = {
      ...DEFAULT_SETTINGS,
      signal: {
        ...DEFAULT_SETTINGS.signal,
        hueDegrees: -12.5,
        rf: { noise: 0.4, ghost: 0.1, beat: 0 }
      },
      display: { ...DEFAULT_SETTINGS.display, overscan: true },
      scale: 3,
      locale: Locale.PtBr
    };

    // Act
    const hash = serializeHash(settings);

    // Assert
    expect(parseHash(hash)).toEqual({ settings, invalid: [] });
  });
});
