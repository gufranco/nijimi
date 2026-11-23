import { describe, expect, it } from 'vitest';

import { FileSlot } from './fileSlot';

describe('FileSlot', () => {
  it('names the picture and the optional flicker frame', () => {
    // Arrange
    const expected = ['main', 'flicker'];

    // Act
    const values = Object.values(FileSlot);

    // Assert
    expect(values).toEqual(expected);
  });
});
