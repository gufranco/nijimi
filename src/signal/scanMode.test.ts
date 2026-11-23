import { describe, expect, it } from 'vitest';

import { ScanMode } from './scanMode';

describe('ScanMode', () => {
  it('keeps the scan mode values that shared links carry', () => {
    // Arrange
    const expected = ['progressive', 'interlaced'];

    // Act
    const values = Object.values(ScanMode);

    // Assert
    expect(values).toEqual(expected);
  });
});
