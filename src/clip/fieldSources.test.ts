import { describe, expect, it } from 'vitest';

import { fieldSources } from './fieldSources';

describe('fieldSources', () => {
  it('shows each field the latest frame that started at or before it', () => {
    // Arrange
    const input = { times: [0, 0.05, 0.1], duration: 0.15, fieldRate: 40 };

    // Act
    const sources = fieldSources(input);

    // Assert
    expect([...sources]).toEqual([0, 0, 1, 1, 2, 2]);
  });

  it('keeps the first frame for fields before a late first timestamp', () => {
    // Arrange
    const input = { times: [0.009, 0.1], duration: 0.2, fieldRate: 20 };

    // Act
    const sources = fieldSources(input);

    // Assert
    expect([...sources]).toEqual([0, 0, 1, 1]);
  });

  it('gives a still or zero-length clip one field', () => {
    // Arrange
    const input = { times: [0], duration: 0, fieldRate: 60 };

    // Act
    const sources = fieldSources(input);

    // Assert
    expect([...sources]).toEqual([0]);
  });

  it('maps a ten-minute clip at 60 fields per second in linear time', () => {
    // Arrange
    const times = Array.from({ length: 18_000 }, (_, index) => index / 30);
    const started = performance.now();

    // Act
    const sources = fieldSources({ times, duration: 600, fieldRate: 60 });

    // Assert
    expect([sources.length, sources[35_999]]).toEqual([36_000, 17_999]);
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
