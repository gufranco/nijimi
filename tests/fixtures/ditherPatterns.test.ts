import { describe, expect, it } from 'vitest';

import { DITHER_PATTERNS } from './ditherPatterns';
import type { DitherPattern } from './ditherPatterns';

const pattern = (id: string): DitherPattern | undefined =>
  DITHER_PATTERNS.find((candidate) => candidate.id === id);

const rows = (mask: Uint8Array, width: number): readonly (readonly number[])[] =>
  Array.from({ length: mask.length / width }, (_, y) =>
    Array.from(mask.slice(y * width, (y + 1) * width))
  );

describe('DITHER_PATTERNS', () => {
  it('lists the 24 patterns P01 to P24', () => {
    // Arrange
    const expected = Array.from(
      { length: 24 },
      (_, index) => `P${String(index + 1).padStart(2, '0')}`
    );

    // Act
    const ids = DITHER_PATTERNS.map((candidate) => candidate.id);

    // Assert
    expect(ids).toEqual(expected);
  });

  it.each([
    [
      'P01',
      [
        [1, 0, 1, 0],
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [0, 1, 0, 1]
      ]
    ],
    [
      'P02',
      [
        [1, 0, 1, 0],
        [1, 0, 1, 0],
        [1, 0, 1, 0],
        [1, 0, 1, 0]
      ]
    ],
    [
      'P03',
      [
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0]
      ]
    ],
    [
      'P04',
      [
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 1, 0, 0]
      ]
    ],
    [
      'P05',
      [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ]
    ],
    [
      'P06',
      [
        [1, 0, 1, 0],
        [0, 0, 0, 0],
        [1, 0, 1, 0],
        [0, 0, 0, 0]
      ]
    ],
    [
      'P07',
      [
        [1, 1, 1, 1],
        [1, 0, 1, 0],
        [1, 1, 1, 1],
        [1, 0, 1, 0]
      ]
    ],
    [
      'P12',
      [
        [1, 1, 1, 1],
        [1, 0, 0, 0],
        [1, 0, 0, 0],
        [1, 0, 0, 0]
      ]
    ],
    [
      'P24',
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    ]
  ])('draws %s as the hand-worked 4x4 tile', (id, expected) => {
    // Arrange
    const candidate = pattern(id);

    // Act
    const mask = candidate?.mask(4, 4) ?? new Uint8Array(0);

    // Assert
    expect(rows(mask, 4)).toEqual(expected);
  });

  it('thresholds a 4-wide gradient against the 2x2 Bayer matrix for P08', () => {
    // Arrange
    const candidate = pattern('P08');

    // Act
    const mask = candidate?.mask(4, 2) ?? new Uint8Array(0);

    // Assert
    expect(rows(mask, 4)).toEqual([
      [1, 0, 1, 1],
      [0, 1, 0, 1]
    ]);
  });

  it('uses four palette levels for the multi-colour pattern P23', () => {
    // Arrange
    const candidate = pattern('P23');

    // Act
    const mask = candidate?.mask(16, 4) ?? new Uint8Array(0);

    // Assert
    expect(new Set(mask)).toEqual(new Set([0, 1, 2, 3]));
    expect(candidate?.levels).toBe(4);
  });

  it('keeps every two-tone pattern within 0 and 1', () => {
    // Arrange
    const twoTone = DITHER_PATTERNS.filter((candidate) => candidate.levels === 2);

    // Act
    const values = new Set(twoTone.flatMap((candidate) => Array.from(candidate.mask(16, 8))));

    // Assert
    expect(values).toEqual(new Set([0, 1]));
  });
});
