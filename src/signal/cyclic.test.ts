import { describe, expect, it } from 'vitest';

import { cyclic } from './cyclic';

describe('cyclic', () => {
  it('wraps an index past the end back to the start', () => {
    // Arrange
    const items = ['a', 'b', 'c'] as const;

    // Act
    const picked = [0, 1, 2, 3, 4].map((index) => cyclic(items, index));

    // Assert
    expect(picked).toEqual(['a', 'b', 'c', 'a', 'b']);
  });

  it('falls back to the first item for a negative index', () => {
    // Arrange
    const items = ['a', 'b'] as const;

    // Act
    const picked = cyclic(items, -1);

    // Assert
    expect(picked).toBe('a');
  });
});
