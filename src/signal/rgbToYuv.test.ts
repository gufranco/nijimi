import { faker } from '@faker-js/faker';
import { beforeEach, describe, expect, it } from 'vitest';

import { rgbToYuv } from './rgbToYuv';
import { yuvToRgb } from './yuvToRgb';

describe('rgbToYuv', () => {
  beforeEach(() => {
    faker.seed(601);
  });

  it.each([
    [
      [1, 1, 1],
      [1, 0, 0]
    ],
    [
      [0, 0, 0],
      [0, 0, 0]
    ],
    [
      [1, 0, 0],
      [0.299, -0.14741, 0.61478]
    ],
    [
      [0, 1, 0],
      [0.587, -0.28939, -0.5148]
    ],
    [
      [0, 0, 1],
      [0.114, 0.4368, -0.09998]
    ]
  ])('converts %j to the BT.601 Y, U, V %j', (rgb, expected) => {
    // Arrange
    const [r, g, b] = rgb as [number, number, number];

    // Act
    const yuv = rgbToYuv(r, g, b);

    // Assert
    yuv.forEach((value, index) => {
      expect(value).toBeCloseTo(expected[index] ?? Number.NaN, 4);
    });
  });

  it('round-trips through yuvToRgb for random colours', () => {
    // Arrange
    const colours = Array.from({ length: 32 }, () => [
      faker.number.float({ min: 0, max: 1 }),
      faker.number.float({ min: 0, max: 1 }),
      faker.number.float({ min: 0, max: 1 })
    ]);

    // Act
    const roundTrips = colours.map(([r = 0, g = 0, b = 0]) => yuvToRgb(...rgbToYuv(r, g, b)));

    // Assert
    roundTrips.forEach((rgb, index) => {
      rgb.forEach((value, channel) => {
        expect(value).toBeCloseTo(colours[index]?.[channel] ?? Number.NaN, 9);
      });
    });
  });
});
