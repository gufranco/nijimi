import { describe, expect, it } from 'vitest';

import { VideoStandard } from './videoStandard';

describe('VideoStandard', () => {
  it('keeps the standard values that shared links carry', () => {
    // Arrange
    const expected = ['ntsc', 'pal-bg', 'pal-m'];

    // Act
    const values = Object.values(VideoStandard);

    // Assert
    expect(values).toEqual(expected);
  });
});
