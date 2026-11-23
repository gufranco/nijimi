import { describe, expect, it } from 'vitest';

import { interleave } from './interleave';

describe('interleave', () => {
  it('weaves three planes into RGB triplets', () => {
    // Arrange
    const planes = [
      Float64Array.from([1, 4]),
      Float64Array.from([2, 5]),
      Float64Array.from([3, 6])
    ] as const;

    // Act
    const rgb = interleave(...planes);

    // Assert
    expect(Array.from(rgb)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
