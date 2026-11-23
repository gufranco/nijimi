import { describe, expect, it } from 'vitest';

import { ConsolePreset } from './consolePreset';

describe('ConsolePreset', () => {
  it('keeps the console preset values that shared links carry', () => {
    // Arrange
    const expected = [
      'nes',
      'snes-256',
      'snes-512',
      'genesis-h32',
      'genesis-h40',
      'sms',
      'ps1-256',
      'ps1-320',
      'ps1-368',
      'ps1-512',
      'ps1-640',
      'sg-1000',
      '32x',
      'atari-2600',
      'atari-7800-160',
      'atari-7800-320',
      'atari-5200-160',
      'atari-5200-320',
      'n64-320',
      'n64-640',
      'saturn-320',
      'saturn-352',
      'saturn-640',
      'saturn-704',
      'game-boy',
      'game-boy-pocket',
      'game-boy-color',
      'game-gear',
      'jaguar-256',
      'jaguar-320',
      'custom'
    ];

    // Act
    const values = Object.values(ConsolePreset);

    // Assert
    expect(values).toEqual(expected);
  });
});
