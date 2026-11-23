import { describe, expect, it } from 'vitest';

import { DisplayKind } from './displayKind';

describe('DisplayKind', () => {
  it('names the WebGL2 renderer and the 2D fallback', () => {
    // Arrange
    const expected = ['webgl2', '2d'];

    // Act
    const values = Object.values(DisplayKind);

    // Assert
    expect(values).toEqual(expected);
  });
});
