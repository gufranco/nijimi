import { describe, expect, it } from 'vitest';

import { CrtModel } from './crtModel';
import { CRT_PRESETS } from './crtPresets';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { reconcileCrtModel } from './reconcileCrtModel';

const pvm = {
  ...DEFAULT_SETTINGS.display,
  ...CRT_PRESETS[CrtModel.ProfessionalMonitor],
  crt: CrtModel.ProfessionalMonitor
};

describe('reconcileCrtModel', () => {
  it('keeps the model while every linked control still matches its look', () => {
    // Arrange
    const display = { ...pvm, overscan: true };

    // Act
    const reconciled = reconcileCrtModel(display);

    // Assert
    expect(reconciled.crt).toBe(CrtModel.ProfessionalMonitor);
  });

  it('switches to custom once a linked control leaves the look', () => {
    // Arrange
    const display = { ...pvm, bloom: 0.9 };

    // Act
    const reconciled = reconcileCrtModel(display);

    // Assert
    expect(reconciled).toEqual({ ...display, crt: CrtModel.Custom });
  });

  it('leaves custom settings alone', () => {
    // Arrange
    const display = DEFAULT_SETTINGS.display;

    // Act
    const reconciled = reconcileCrtModel(display);

    // Assert
    expect(reconciled).toBe(display);
  });
});
