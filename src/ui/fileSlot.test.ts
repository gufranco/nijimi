import { describe, expect, it } from 'vitest';

import { FileSlot } from './fileSlot';

describe('FileSlot', () => {
  it('names the picture, the optional flicker frame and a clip', () => {
    // Arrange
    const expected = ['main', 'flicker', 'clip'];

    // Act
    const values = Object.values(FileSlot);

    // Assert
    expect(values).toEqual(expected);
  });
});
