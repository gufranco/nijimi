import { describe, expect, it } from 'vitest';

import { compileProgram } from './compileProgram';
import { SHADER_SOURCE } from './shaderSource';

const context = (): WebGL2RenderingContext => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (gl === null) {
    throw new Error('this test needs WebGL2');
  }
  return gl;
};

describe('compileProgram', () => {
  it('links the CRT shaders', () => {
    // Arrange
    const gl = context();

    // Act
    const program = compileProgram(gl, SHADER_SOURCE);

    // Assert
    expect(gl.getProgramParameter(program, gl.LINK_STATUS)).toBe(true);
  });

  it('throws with the compiler log for a broken shader', () => {
    // Arrange
    const gl = context();

    // Act
    const compile = (): WebGLProgram =>
      compileProgram(gl, {
        vertex: SHADER_SOURCE.vertex,
        fragment: '#version 300 es\nvoid main() { broken }'
      });

    // Assert
    expect(compile).toThrow(/fragment shader failed to compile/);
  });

  it('throws when the context is lost before compiling', () => {
    // Arrange
    const gl = context();
    gl.getExtension('WEBGL_lose_context')?.loseContext();

    // Act
    const compile = (): WebGLProgram => compileProgram(gl, SHADER_SOURCE);

    // Assert
    expect(compile).toThrow('WebGL2 context is lost');
  });

  it('throws when the stages do not link', () => {
    // Arrange
    const gl = context();
    const vertex =
      '#version 300 es\nout vec3 vMissing;\nvoid main() { vMissing = vec3(0.0); gl_Position = vec4(0.0); }';
    const fragment =
      '#version 300 es\nprecision highp float;\nin vec4 vOther;\nout vec4 o;\nvoid main() { o = vOther; }';

    // Act
    const compile = (): WebGLProgram => compileProgram(gl, { vertex, fragment });

    // Assert
    expect(compile).toThrow(/program failed to link/);
  });
});
