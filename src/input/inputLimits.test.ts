import { describe, expect, it } from 'vitest';

import { INPUT_LIMITS } from './inputLimits';

describe('INPUT_LIMITS', () => {
  it('limits a PNG to 32 MB and any picture to 4096 pixels a side, 1024 at native scale', () => {
    // Arrange
    const expected = { maxFileBytes: 33_554_432, maxFileSide: 4096, maxNativeSide: 1024 };

    // Act
    const limits = { ...INPUT_LIMITS };

    // Assert
    expect(limits).toEqual(expected);
  });
});
