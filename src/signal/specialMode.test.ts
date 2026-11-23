import { describe, expect, it } from 'vitest';

import { SpecialMode } from './specialMode';

describe('SpecialMode', () => {
  it('names each hardware mode a picture can need beyond the base mode', () => {
    // Arrange
    const expected = [
      'interlace',
      'pal-v30',
      'sms2-vdp',
      'snes-color-math',
      'snes-color-math-or-direct-color',
      'shadow-highlight',
      'display-24bit',
      'text-mode',
      '32x-direct-color',
      'per-line-colors',
      'custom-line-count',
      'gtia-luminance-mode',
      'framebuffer-32bit',
      'saturn-cram-24bit',
      'jaguar-rgb24'
    ];

    // Act
    const values = Object.values(SpecialMode);

    // Assert
    expect(values).toEqual(expected);
  });
});
