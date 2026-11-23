import { describe, expect, it } from 'vitest';

import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { VideoStandard } from '../signal/videoStandard';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { MaskKind } from './maskKind';

describe('DEFAULT_SETTINGS', () => {
  it('starts on composite NTSC from a Genesis in H40 with an aperture grille', () => {
    // Arrange
    const settings = DEFAULT_SETTINGS;

    // Act
    const summary = [
      settings.signal.connection,
      settings.signal.standard,
      settings.signal.preset,
      settings.display.mask
    ];

    // Assert
    expect(summary).toEqual([
      Connection.Composite,
      VideoStandard.Ntsc,
      ConsolePreset.GenesisH40,
      MaskKind.ApertureGrille
    ]);
  });

  it('starts with the language taken from the browser', () => {
    // Arrange
    const settings = DEFAULT_SETTINGS;

    // Act
    const locale = settings.locale;

    // Assert
    expect(locale).toBeNull();
  });

  it('starts with a clean RF tuner and automatic scale detection', () => {
    // Arrange
    const settings = DEFAULT_SETTINGS;

    // Act
    const rf = settings.signal.rf;

    // Assert
    expect(rf).toEqual({ noise: 0, ghost: 0, beat: 0 });
    expect(settings.scale).toBe(0);
  });
});
