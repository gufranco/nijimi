import { describe, expect, it } from 'vitest';

import { createAppendLog } from './createAppendLog';

describe('createAppendLog', () => {
  it('keeps every appended item in order across its 1024-item chunks', () => {
    // Arrange
    const log = createAppendLog<number>();
    const expected = Array.from({ length: 2500 }, (_, index) => index * 3);

    // Act
    expected.forEach((item) => {
      log.append(item);
    });

    // Assert
    expect(log.items()).toEqual(expected);
  });

  it('starts empty', () => {
    // Arrange
    const log = createAppendLog<string>();

    // Act
    const items = log.items();

    // Assert
    expect(items).toEqual([]);
  });
});
