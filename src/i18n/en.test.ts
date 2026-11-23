import { describe, expect, it } from 'vitest';

import { EN } from './en';

describe('EN', () => {
  it('fills every message with text', () => {
    // Arrange
    const values = (Object.keys(EN) as (keyof typeof EN)[]).map((key) => EN[key]);

    // Act
    const empty = values.filter((value) => value.trim() === '');

    // Assert
    expect(empty).toHaveLength(0);
  });

  it('names the native size limit in the oversize error', () => {
    // Arrange
    const message = EN.errorTooLarge;

    // Act
    const placeholders = message.match(/\{[a-z]+\}/g);

    // Assert
    expect(placeholders).toEqual(['{width}', '{height}']);
    expect(message).toContain('1024');
  });
});
