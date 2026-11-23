import { describe, expect, it } from 'vitest';

import { DIFFUSION_KERNELS } from './diffusionKernels';

describe('DIFFUSION_KERNELS', () => {
  it.each([
    ['floyd-steinberg', 16, 16],
    ['jarvis-judice-ninke', 48, 48],
    ['stucki', 42, 42],
    ['burkes', 32, 32],
    ['sierra', 32, 32],
    ['two-row-sierra', 16, 16],
    ['sierra-lite', 4, 4],
    ['atkinson', 8, 6]
  ])('gives %s a divisor of %d and taps summing to %d', (name, divisor, weightSum) => {
    // Arrange
    const kernel = DIFFUSION_KERNELS.find((candidate) => candidate.name === name);

    // Act
    const sum = kernel?.taps.reduce((total, [, , weight]) => total + weight, 0);

    // Assert
    expect(kernel?.divisor).toBe(divisor);
    expect(sum).toBe(weightSum);
  });

  it('only pushes error forward in scan order', () => {
    // Arrange
    const taps = DIFFUSION_KERNELS.flatMap((kernel) => kernel.taps);

    // Act
    const backwards = taps.filter(([dx, dy]) => dy < 0 || (dy === 0 && dx <= 0));

    // Assert
    expect(backwards).toHaveLength(0);
  });
});
