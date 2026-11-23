import { describe, expect, it } from 'vitest';

import { ConsolePreset } from './consolePreset';
import { HANDHELD_PRESETS } from './handheldPresets';

describe('HANDHELD_PRESETS', () => {
  it('lists the handhelds with an LCD and no TV output', () => {
    // Arrange
    const expected = [
      ConsolePreset.GameBoy,
      ConsolePreset.GameBoyPocket,
      ConsolePreset.GameBoyColor,
      ConsolePreset.GameGear
    ];

    // Act
    const handhelds = [...HANDHELD_PRESETS];

    // Assert
    expect(handhelds).toEqual(expected);
  });
});
