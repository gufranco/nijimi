import { describe, expect, it } from 'vitest';

import { EN } from './en';
import { JA } from './ja';

const placeholders = (text: string): readonly string[] =>
  (text.match(/\{[a-z]+\}/g) ?? []).toSorted();

describe('JA', () => {
  it('translates every English message', () => {
    // Arrange
    const keys = Object.keys(EN).toSorted();

    // Act
    const translated = Object.keys(JA).toSorted();

    // Assert
    expect(translated).toEqual(keys);
    (Object.keys(JA) as (keyof typeof JA)[]).forEach((key) => {
      expect(JA[key].trim()).not.toBe('');
    });
  });

  it('keeps the same placeholders as English in every message', () => {
    // Arrange
    const keys = Object.keys(EN) as (keyof typeof EN)[];

    // Act
    const mismatched = keys.filter(
      (key) => placeholders(EN[key]).join() !== placeholders(JA[key]).join()
    );

    // Assert
    expect(mismatched).toEqual([]);
  });

  it('names the consoles as they were sold in Japan', () => {
    // Arrange
    const names = [JA.presetNes, JA.presetSnes256, JA.presetGenesisH40];

    // Act
    const text = names.join(' ');

    // Assert
    expect(text).toContain('ファミコン');
    expect(text).toContain('スーパーファミコン');
    expect(text).toContain('メガドライブ');
  });
});
