import { describe, expect, it } from 'vitest';

import { Connection } from './connection';

describe('Connection', () => {
  it('keeps the connection values that shared links carry', () => {
    // Arrange
    const expected = ['rf', 'composite', 'svideo', 'component', 'rgb'];

    // Act
    const values = Object.values(Connection);

    // Assert
    expect(values).toEqual(expected);
  });
});
