import { describe, expect, it } from 'vitest';

import { Connection } from '../signal/connection';
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
    expect(keys).toHaveLength(25);
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
});
