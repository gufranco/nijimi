import { describe, expect, it } from 'vitest';

import { EN } from './en';
import { PT_BR } from './ptBr';

const placeholders = (text: string): readonly string[] =>
  (text.match(/\{[a-z]+\}/g) ?? []).toSorted();

describe('PT_BR', () => {
  it('translates every English message', () => {
    // Arrange
    const keys = Object.keys(EN).toSorted();

    // Act
    const translated = Object.keys(PT_BR).toSorted();

    // Assert
    expect(translated).toEqual(keys);
    (Object.keys(PT_BR) as (keyof typeof PT_BR)[])
      .map((key) => PT_BR[key])
      .forEach((value) => {
        expect(value.trim()).not.toBe('');
      });
  });

  it('keeps the same placeholders as English in every message', () => {
    // Arrange
    const keys = Object.keys(EN) as (keyof typeof EN)[];

    // Act
    const mismatched = keys.filter(
      (key) => placeholders(EN[key]).join() !== placeholders(PT_BR[key]).join()
    );

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('writes Portuguese with its diacritics', () => {
    // Arrange
    const sample = [PT_BR.sectionSignal, PT_BR.errorCorrupt, PT_BR.privacyNote];

    // Act
    const text = sample.join(' ');

    // Assert
    expect(text).toContain('Sinal');
    expect(text).toContain('não');
    expect(text).toContain('página');
  });
});
