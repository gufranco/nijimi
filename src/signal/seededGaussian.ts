const UINT32 = 2 ** 32;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const TINY = 1e-12;

const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + MULBERRY_INCREMENT) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / UINT32;
  };
};

export const seededGaussian = (seed: number, count: number): Float64Array => {
  const uniform = mulberry32(seed);
  return Float64Array.from({ length: count }, () => {
    const radius = Math.sqrt(-2 * Math.log(Math.max(TINY, uniform())));
    return radius * Math.cos(2 * Math.PI * uniform());
  });
};
