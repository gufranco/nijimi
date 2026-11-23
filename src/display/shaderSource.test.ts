import { describe, expect, it } from 'vitest';

import { SHADER_SOURCE } from './shaderSource';

describe('SHADER_SOURCE', () => {
  it('targets GLSL ES 3.00 in both stages', () => {
    // Arrange
    const stages = [SHADER_SOURCE.vertex, SHADER_SOURCE.fragment];

    // Act
    const versions = stages.map((stage) => stage.split('\n')[0]);

    // Assert
    expect(versions).toEqual(['#version 300 es', '#version 300 es']);
  });

  it('declares every uniform the renderer sets', () => {
    // Arrange
    const uniforms = [
      'uSource',
      'uSourceSize',
      'uOutputSize',
      'uGamma',
      'uScanlines',
      'uMask',
      'uMaskStrength',
      'uBloom',
      'uCurvature',
      'uCrop'
    ];

    // Act
    const missing = uniforms.filter(
      (name) => !new RegExp(`uniform \\w+ ${name};`).test(SHADER_SOURCE.fragment)
    );

    // Assert
    expect(missing).toEqual([]);
  });
});
