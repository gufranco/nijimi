import { describe, expect, it } from 'vitest';

import { averageFrames } from './averageFrames';

describe('averageFrames', () => {
  it('averages in linear light, so black and white meet above mid grey', () => {
    // Arrange
    const frames = [
      { rows: [Float32Array.from([0, 0, 0])] },
      { rows: [Float32Array.from([1, 1, 1])] }
    ];

    // Act
    const data = averageFrames({ frames, width: 1, height: 1, gamma: 2.4 });

    // Assert
    expect(data[0]).toBeCloseTo(0.5 ** (1 / 2.4), 6);
  });

  it('averages each row only over the frames that lit it', () => {
    // Arrange
    const frames = [
      { rows: [Float32Array.from([0.6, 0.6, 0.6]), null] },
      { rows: [null, Float32Array.from([0.2, 0.2, 0.2])] }
    ];

    // Act
    const data = averageFrames({ frames, width: 1, height: 2, gamma: 2.4 });

    // Assert
    expect(Array.from(data).map((value) => Number(value.toFixed(6)))).toEqual([
      0.6, 0.6, 0.6, 0.2, 0.2, 0.2
    ]);
  });

  it('leaves a row that no frame lit black', () => {
    // Arrange
    const frames = [{ rows: [null] }];

    // Act
    const data = averageFrames({ frames, width: 1, height: 1, gamma: 2.4 });

    // Assert
    expect(Array.from(data)).toEqual([0, 0, 0]);
  });

  it('treats rows past the end of a shorter frame as dark', () => {
    // Arrange
    const frames = [{ rows: [Float32Array.from([0.3, 0.3, 0.3])] }];

    // Act
    const data = averageFrames({ frames, width: 1, height: 2, gamma: 2.4 });

    // Assert
    expect(Array.from(data.slice(3))).toEqual([0, 0, 0]);
  });

  it('keeps a negative overshoot negative through the gamma round trip', () => {
    // Arrange
    const frames = [{ rows: [Float32Array.from([-0.1, 0.5, 1.1])] }];

    // Act
    const data = averageFrames({ frames, width: 1, height: 1, gamma: 2.4 });

    // Assert
    expect(data[0]).toBeCloseTo(-0.1, 6);
    expect(data[2]).toBeCloseTo(1.1, 6);
  });
});
