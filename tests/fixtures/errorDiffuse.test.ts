import { describe, expect, it } from 'vitest';

import { DIFFUSION_KERNELS } from './diffusionKernels';
import { errorDiffuse } from './errorDiffuse';
import type { DiffusionKernel } from './diffusionKernels';

const kernel = (name: string): DiffusionKernel | undefined =>
  DIFFUSION_KERNELS.find((candidate) => candidate.name === name) ?? DIFFUSION_KERNELS[0];

describe('errorDiffuse', () => {
  it('turns a flat 50 percent Floyd-Steinberg row into 1, 0, 1, 0', () => {
    // Arrange
    const input = { level: () => 0.5, width: 4, height: 1, kernel: kernel('floyd-steinberg') };

    // Act
    const bits = errorDiffuse(input);

    // Assert
    expect(Array.from(bits)).toEqual([1, 0, 1, 0]);
  });

  it('turns a flat 50 percent Atkinson row into 1, 0, 0, 1', () => {
    // Arrange
    const input = { level: () => 0.5, width: 4, height: 1, kernel: kernel('atkinson') };

    // Act
    const bits = errorDiffuse(input);

    // Assert
    expect(Array.from(bits)).toEqual([1, 0, 0, 1]);
  });

  it('keeps the average level of a 25 percent field for every kernel that diffuses all the error', () => {
    // Arrange
    const complete = DIFFUSION_KERNELS.filter(
      (candidate) =>
        candidate.taps.reduce((sum, [, , weight]) => sum + weight, 0) === candidate.divisor
    );

    // Act
    const coverage = complete.map((candidate) => {
      const bits = errorDiffuse({ level: () => 0.25, width: 32, height: 32, kernel: candidate });
      return bits.reduce((sum, bit) => sum + bit, 0) / bits.length;
    });

    // Assert
    expect(coverage).toHaveLength(7);
    coverage.forEach((fraction) => {
      expect(fraction).toBeGreaterThan(0.22);
      expect(fraction).toBeLessThan(0.28);
    });
  });

  it('places fewer dots than the level with Atkinson, which drops a quarter of the error', () => {
    // Arrange
    const input = { level: () => 0.25, width: 32, height: 32, kernel: kernel('atkinson') };

    // Act
    const bits = errorDiffuse(input);

    // Assert
    expect(bits.reduce((sum, bit) => sum + bit, 0) / bits.length).toBeLessThan(0.22);
  });
});
