import { describe, expect, it } from 'vitest';

import { Connection } from '../signal/connection';
import { CrtModel } from './crtModel';
import { CRT_PRESETS } from './crtPresets';
import { DEFAULT_SETTINGS } from './defaultSettings';
import { HASH_FIELDS } from './hashFields';
import type { HashField } from './hashFields';

const field = (key: string): HashField | undefined =>
  HASH_FIELDS.find((candidate) => candidate.key === key);

describe('HASH_FIELDS', () => {
  it('gives every field a unique short key', () => {
    // Arrange
    const keys = HASH_FIELDS.map((candidate) => candidate.key);

    // Act
    const unique = new Set(keys);

    // Assert
    expect(unique.size).toBe(keys.length);
    expect(keys).toHaveLength(27);
  });

  it('applies a valid connection', () => {
    // Arrange
    const connection = field('c');

    // Act
    const settings = connection?.apply(DEFAULT_SETTINGS, 'svideo');

    // Assert
    expect(settings?.signal.connection).toBe(Connection.SVideo);
  });

  it('refuses a value outside the enum', () => {
    // Arrange
    const connection = field('c');

    // Act
    const settings = connection?.apply(DEFAULT_SETTINGS, 'scart');

    // Assert
    expect(settings).toBeNull();
  });

  it('refuses a number outside its range', () => {
    // Arrange
    const hue = field('hue');

    // Act
    const settings = hue?.apply(DEFAULT_SETTINGS, '90');

    // Assert
    expect(settings).toBeNull();
  });

  it('reads and writes the overscan flag as 0 or 1', () => {
    // Arrange
    const overscan = field('os');

    // Act
    const settings = overscan?.apply(DEFAULT_SETTINGS, '1') ?? DEFAULT_SETTINGS;

    // Assert
    expect(settings.display.overscan).toBe(true);
    expect(overscan?.read(settings)).toBe('1');
    expect(overscan?.read(DEFAULT_SETTINGS)).toBe('0');
  });

  it('round-trips every field through its own text form', () => {
    // Arrange
    const texts = HASH_FIELDS.map(
      (candidate) => [candidate, candidate.read(DEFAULT_SETTINGS)] as const
    );

    // Act
    const applied = texts.map(([candidate, text]) => candidate.apply(DEFAULT_SETTINGS, text));

    // Assert
    applied.forEach((settings) => {
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  it('applies every linked screen control of a CRT model', () => {
    // Arrange
    const model = field('t');

    // Act
    const settings = model?.apply(DEFAULT_SETTINGS, 'pvm');

    // Assert
    expect(settings?.display).toEqual({
      ...DEFAULT_SETTINGS.display,
      ...CRT_PRESETS[CrtModel.ProfessionalMonitor],
      crt: CrtModel.ProfessionalMonitor
    });
  });

  it('keeps the current screen controls when the model is set back to custom', () => {
    // Arrange
    const pvm = field('t')?.apply(DEFAULT_SETTINGS, 'pvm') ?? DEFAULT_SETTINGS;

    // Act
    const settings = field('t')?.apply(pvm, 'custom');

    // Assert
    expect(settings?.display).toEqual({ ...pvm.display, crt: CrtModel.Custom });
  });

  it('switches the model to custom when a linked control changes', () => {
    // Arrange
    const pvm = field('t')?.apply(DEFAULT_SETTINGS, 'pvm') ?? DEFAULT_SETTINGS;

    // Act
    const settings = field('b')?.apply(pvm, '0.9');

    // Assert
    expect(settings?.display.crt).toBe(CrtModel.Custom);
  });

  it('accepts a mask pitch from 1 to 4 only', () => {
    // Arrange
    const pitch = field('mp');

    // Act
    const values = ['1', '4', '0', '5', '1.5'].map(
      (raw) => pitch?.apply(DEFAULT_SETTINGS, raw)?.display.maskPitch ?? null
    );

    // Assert
    expect(values).toEqual([1, 4, null, null, null]);
  });

  it('switches to RGB and the handheld LCD look when a handheld is picked', () => {
    // Arrange
    const preset = field('p');

    // Act
    const settings = preset?.apply(DEFAULT_SETTINGS, 'game-boy-color');

    // Assert
    expect([settings?.signal.connection, settings?.display.crt, settings?.display.mask]).toEqual([
      Connection.Rgb,
      CrtModel.HandheldLcd,
      CRT_PRESETS[CrtModel.HandheldLcd].mask
    ]);
  });
});
