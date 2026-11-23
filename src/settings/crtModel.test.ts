import { describe, expect, it } from 'vitest';

import { CrtModel } from './crtModel';

describe('CrtModel', () => {
  it('keeps the CRT model values that shared links carry', () => {
    // Arrange
    const expected = [
      'custom',
      'consumer-shadow',
      'consumer-grille',
      'consumer-slot',
      'pvm',
      'bvm',
      'pc-monitor',
      'arcade',
      'lcd'
    ];

    // Act
    const values = Object.values(CrtModel);

    // Assert
    expect(values).toEqual(expected);
  });
});
