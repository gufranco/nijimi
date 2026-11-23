import { describe, expect, it } from 'vitest';

import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { VideoStandard } from '../signal/videoStandard';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { parseHash } from './parseHash';

describe('parseHash', () => {
  it('restores the connection, standard and console from a shared link', () => {
    // Arrange
    const hash = '#c=svideo&s=pal-m&p=genesis-h40';

    // Act
    const parsed = parseHash(hash);

    // Assert
    expect(parsed.invalid).toEqual([]);
    expect([
      parsed.settings.signal.connection,
      parsed.settings.signal.standard,
      parsed.settings.signal.preset
    ]).toEqual([Connection.SVideo, VideoStandard.PalM, ConsolePreset.GenesisH40]);
  });

  it('falls back to the default and names an invalid value', () => {
    // Arrange
    const hash = '#c=scart';

    // Act
    const parsed = parseHash(hash);

    // Assert
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
    expect(parsed.invalid).toEqual(['c=scart']);
  });

  it('names an unknown key as invalid', () => {
    // Arrange
    const hash = '#zoom=4';

    // Act
    const parsed = parseHash(hash);

    // Assert
    expect(parsed.invalid).toEqual(['zoom=4']);
  });

  it('returns the defaults for an empty hash', () => {
    // Arrange
    const hash = '';

    // Act
    const parsed = parseHash(hash);

    // Assert
    expect(parsed).toEqual({ settings: DEFAULT_SETTINGS, invalid: [] });
  });

  it('reads at most 64 parameters', () => {
    // Arrange
    const hash = `#${Array.from({ length: 100 }, (_, index) => `k${String(index)}=1`).join('&')}`;

    // Act
    const parsed = parseHash(hash);

    // Assert
    expect(parsed.invalid).toHaveLength(64);
  });
});
