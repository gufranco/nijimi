import { describe, expect, it } from 'vitest';

import { CrtModel } from './crtModel';
import { CRT_PRESETS } from './crtPresets';
import { MaskKind } from './maskKind';

describe('CRT_PRESETS', () => {
  it('has a look for every model except custom', () => {
    // Arrange
    const expected = Object.values(CrtModel).filter((model) => model !== CrtModel.Custom);

    // Act
    const keys = Object.keys(CRT_PRESETS);

    // Assert
    expect(keys).toEqual(expected);
  });

  it('keeps every value inside the range its control accepts', () => {
    // Arrange
    const looks = Object.values(CRT_PRESETS);

    // Act
    const outside = looks.filter(
      (look) =>
        [look.scanlines, look.maskStrength, look.bloom, look.curvature].some(
          (value) => value < 0 || value > 1
        ) ||
        !Number.isInteger(look.maskPitch) ||
        look.maskPitch < 1 ||
        look.maskPitch > 4
    );

    // Assert
    expect(outside).toEqual([]);
  });

  it('gives professional and broadcast monitors finer masks and sharper scanlines than consumer sets', () => {
    // Arrange
    const consumer = CRT_PRESETS[CrtModel.ConsumerApertureGrille];

    // Act
    const pro = [CRT_PRESETS[CrtModel.ProfessionalMonitor], CRT_PRESETS[CrtModel.BroadcastMonitor]];

    // Assert
    expect(
      pro.map((look) => [look.maskPitch < consumer.maskPitch, look.scanlines > consumer.scanlines])
    ).toEqual([
      [true, true],
      [true, true]
    ]);
  });

  it('draws handheld screens with an LCD grid and no scanlines', () => {
    // Arrange
    const model = CrtModel.HandheldLcd;

    // Act
    const look = CRT_PRESETS[model];

    // Assert
    expect([look.mask, look.scanlines]).toEqual([MaskKind.LcdGrid, 0]);
  });
});
