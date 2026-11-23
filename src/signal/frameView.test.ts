import { describe, expect, it } from 'vitest';

import { FrameView } from './frameView';

describe('FrameView', () => {
  it('keeps the frame view values that shared links carry', () => {
    // Arrange
    const expected = ['average', 'single'];

    // Act
    const values = Object.values(FrameView);

    // Assert
    expect(values).toEqual(expected);
  });
});
