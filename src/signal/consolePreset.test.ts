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
      'custom'
    ];

    // Act
    const values = Object.values(ConsolePreset);

    // Assert
    expect(values).toEqual(expected);
  });
});
