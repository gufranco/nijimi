import { describe, expect, it } from 'vitest';

import { formatCounter } from './formatCounter';

describe('formatCounter', () => {
  it.each([
    [0, '0:00:00'],
    [5.9, '0:00:05'],
    [65, '0:01:05'],
    [3725, '1:02:05']
  ])('shows %s seconds as %s, like a tape counter', (seconds, expected) => {
    // Arrange
    const input = seconds;

    // Act
    const text = formatCounter(input);

    // Assert
    expect(text).toBe(expected);
  });
});
