import { MaskKind } from '../settings/maskKind';
import { compileProgram } from './compileProgram';
import { displayGeometry } from './displayGeometry';
import { DisplayKind } from './displayKind';
import { SHADER_SOURCE } from './shaderSource';
import type { Display, DisplayGeometry, DisplayInput } from './types';

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const QUAD_VERTICES = 4;
const MASK_CODES: Readonly<Record<MaskKind, number>> = {
  [MaskKind.None]: 0,
  [MaskKind.ApertureGrille]: 1,
  [MaskKind.SlotMask]: 2,
  [MaskKind.ShadowMask]: 3
};

interface GlResources {
  readonly gl: WebGL2RenderingContext;
  readonly texture: WebGLTexture;
  readonly uniform: (name: string) => WebGLUniformLocation | null;
}

const prepare = (gl: WebGL2RenderingContext): GlResources => {
  const program = compileProgram(gl, SHADER_SOURCE);
  gl.useProgram(program);
  gl.bindVertexArray(gl.createVertexArray());
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return { gl, texture, uniform: (name) => gl.getUniformLocation(program, name) };
};

const setUniforms = (
  resources: GlResources,
  input: DisplayInput,
  geometry: DisplayGeometry
): void => {
  const { gl, uniform } = resources;
  gl.uniform1i(uniform('uSource'), 0);
  gl.uniform2f(uniform('uSourceSize'), input.image.width, input.image.height);
  gl.uniform2f(uniform('uOutputSize'), geometry.width, geometry.height);
  gl.uniform1f(uniform('uGamma'), input.gamma);
  gl.uniform1f(uniform('uScanlines'), input.settings.scanlines);
  gl.uniform1i(uniform('uMask'), MASK_CODES[input.settings.mask]);
  gl.uniform1f(uniform('uMaskStrength'), input.settings.maskStrength);
  gl.uniform1f(uniform('uBloom'), input.settings.bloom);
  gl.uniform1f(uniform('uCurvature'), input.settings.curvature);
  gl.uniform1f(uniform('uCrop'), geometry.crop);
};

const drawFrame = (
  resources: GlResources,
  canvas: HTMLCanvasElement,
  input: DisplayInput
): DisplayGeometry => {
  const { gl } = resources;
  const geometry = displayGeometry({
    image: input.image,
    scan: input.scan,
    overscan: input.settings.overscan
  });
  canvas.width = geometry.width;
  canvas.height = geometry.height;
  gl.viewport(0, 0, geometry.width, geometry.height);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, resources.texture);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGB32F,
    input.image.width,
    input.image.height,
    0,
    gl.RGB,
    gl.FLOAT,
    input.image.data
  );
  setUniforms(resources, input, geometry);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, QUAD_VERTICES);
  return geometry;
};

export const createGlDisplay = (canvas: HTMLCanvasElement): Display | null => {
  const gl = canvas.getContext('webgl2', { antialias: false, alpha: false });
  if (gl === null) {
    return null;
  }
  const resources = prepare(gl);
  return { kind: DisplayKind.WebGl2, canvas, draw: (input) => drawFrame(resources, canvas, input) };
};
