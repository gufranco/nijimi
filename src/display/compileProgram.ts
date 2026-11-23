import { required } from './required';

const compileStage = (
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
  name: string
): WebGLShader => {
  const shader = required(gl.createShader(type), `${name} shader`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) !== true) {
    throw new Error(`${name} shader failed to compile: ${String(gl.getShaderInfoLog(shader))}`);
  }
  return shader;
};

export const compileProgram = (
  gl: WebGL2RenderingContext,
  source: { readonly vertex: string; readonly fragment: string }
): WebGLProgram => {
  if (gl.isContextLost()) {
    throw new Error('WebGL2 context is lost');
  }
  const program = gl.createProgram();
  gl.attachShader(program, compileStage(gl, gl.VERTEX_SHADER, source.vertex, 'vertex'));
  gl.attachShader(program, compileStage(gl, gl.FRAGMENT_SHADER, source.fragment, 'fragment'));
  gl.linkProgram(program);
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error(`program failed to link: ${String(gl.getProgramInfoLog(program))}`);
  }
  return program;
};
