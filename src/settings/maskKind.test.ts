import { describe, expect, it } from 'vitest';

import { MaskKind } from './maskKind';

describe('MaskKind', () => {
  it('keeps the mask values that shared links carry', () => {
    // Arrange
    const expected = ['none', 'aperture-grille', 'slot-mask', 'shadow-mask', 'lcd-grid'];

    // Act
    const values = Object.values(MaskKind);

    // Assert
    expect(values).toEqual(expected);
  });
});
