import { describe, expect, it } from 'vitest';

import { isRowLit } from './isRowLit';
import { ScanMode } from './scanMode';

describe('isRowLit', () => {
  it('lights every row of a progressive frame', () => {
    // Arrange
    const rows = [0, 1, 2, 3];

    // Act
    const lit = rows.map((row) => isRowLit(row, 1, ScanMode.Progressive));

    // Assert
    expect(lit).toEqual([true, true, true, true]);
  });

  it('lights only the rows of the current field when interlaced', () => {
    // Arrange
    const rows = [0, 1, 2, 3];

    // Act
    const lit = rows.map((row) => isRowLit(row, 1, ScanMode.Interlaced));

    // Assert
    expect(lit).toEqual([false, true, false, true]);
  });
});
