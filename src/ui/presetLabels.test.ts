import { describe, expect, it } from 'vitest';

import { ConsolePreset } from '../signal/consolePreset';
import { PRESET_LABELS } from './presetLabels';

describe('PRESET_LABELS', () => {
  it('labels every console preset in menu order', () => {
    // Arrange
    const presets = Object.values(ConsolePreset);

    // Act
    const keys = Object.keys(PRESET_LABELS);

    // Assert
    expect(keys).toEqual(presets);
  });
});
