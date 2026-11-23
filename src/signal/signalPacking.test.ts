import { describe, expect, it } from 'vitest';

import { SIGNAL_PACKING } from './signalPacking';

describe('SIGNAL_PACKING', () => {
  it('stores samples from -0.25 to 1.25 in one byte, room for filter ringing past black and white', () => {
    // Arrange
    const expected = { min: -0.25, range: 1.5, maxByte: 255 };

    // Act
    const packing = { ...SIGNAL_PACKING };

    // Assert
    expect(packing).toEqual(expected);
  });
});
