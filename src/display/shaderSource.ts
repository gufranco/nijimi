const VERTEX = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
uniform sampler2D uSource;
uniform vec2 uSourceSize;
uniform vec2 uOutputSize;
uniform float uGamma;
uniform float uScanlines;
uniform int uMask;
uniform int uMaskPitch;
uniform float uMaskStrength;
uniform float uBloom;
uniform float uCurvature;
uniform float uCrop;
in vec2 vUv;
out vec4 outColor;

const float SQRT_TWO_PI = 2.5066283;
const vec3 REC709 = vec3(0.2126, 0.7152, 0.0722);

vec3 linearAt(int x, int y) {
  ivec2 size = ivec2(uSourceSize);
  if (x < 0 || y < 0 || x >= size.x || y >= size.y) {
    return vec3(0.0);
  }
  vec3 c = texelFetch(uSource, ivec2(x, y), 0).rgb;
  return sign(c) * pow(abs(c), vec3(uGamma));
}

vec3 rowAt(float sx, int y) {
  float fx = floor(sx);
  return mix(linearAt(int(fx), y), linearAt(int(fx) + 1, y), sx - fx);
}

vec2 warp(vec2 uv) {
  vec2 c = uv * 2.0 - 1.0;
  c *= 1.0 + uCurvature * 0.12 * dot(c, c);
  return c * 0.5 + 0.5;
}

vec3 beam(float sx, float sy) {
  int r0 = int(floor(sy));
  vec3 sum = vec3(0.0);
  for (int k = -1; k <= 1; k++) {
    int r = r0 + k;
    vec3 c = rowAt(sx, r);
    float lum = clamp(dot(c, REC709), 0.0, 1.0);
    float sigma = mix(0.5, mix(0.16, 0.34, sqrt(lum)), uScanlines);
    float d = sy - (float(r) + 0.5);
    sum += c * exp(-d * d / (2.0 * sigma * sigma)) / (sigma * SQRT_TWO_PI);
  }
  return sum;
}

vec3 glow(float sx, float sy) {
  int r0 = int(floor(sy));
  vec3 sum = vec3(0.0);
  for (int k = -1; k <= 1; k++) {
    for (int j = -2; j <= 2; j++) {
      sum += rowAt(sx + float(j) * 2.0, r0 + k);
    }
  }
  return sum / 15.0;
}

vec3 triad(int i) {
  return i == 0 ? vec3(1.0, 0.0, 0.0) : (i == 1 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0));
}

vec3 maskAt(ivec2 pixel) {
  ivec2 p = pixel / max(uMaskPitch, 1);
  if (uMask == 4) {
    return (p.x % 3 == 2 || p.y % 3 == 2) ? vec3(0.0) : vec3(1.5);
  }
  if (uMask == 1) {
    return triad(p.x % 3) * 3.0;
  }
  if (uMask == 2) {
    int stagger = ((p.x / 3) % 2) * 2;
    return ((p.y + stagger) % 4 == 3) ? vec3(0.0) : triad(p.x % 3) * 4.0;
  }
  if (uMask == 3) {
    int shift = ((p.y / 2) % 2) * 2;
    return triad((p.x + shift) % 3) * 3.0;
  }
  return vec3(1.0);
}

vec3 encodeSrgb(vec3 c) {
  vec3 x = clamp(c, 0.0, 1.0);
  return mix(x * 12.92, 1.055 * pow(x, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), x));
}

void main() {
  vec2 uv = warp(vec2(vUv.x, 1.0 - vUv.y));
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 framed = mix(vec2(uCrop), vec2(1.0 - uCrop), uv);
  float sx = framed.x * uSourceSize.x - 0.5;
  float sy = framed.y * uSourceSize.y;
  vec3 light = beam(sx, sy) + glow(sx, sy) * uBloom * 0.5;
  ivec2 pixel = ivec2(gl_FragCoord.x, uOutputSize.y - gl_FragCoord.y);
  light *= mix(vec3(1.0), maskAt(pixel), uMaskStrength);
  outColor = vec4(encodeSrgb(light), 1.0);
}
`;

export const SHADER_SOURCE = { vertex: VERTEX, fragment: FRAGMENT } as const;
