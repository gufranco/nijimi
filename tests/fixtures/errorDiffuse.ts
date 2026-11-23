import type { DiffusionKernel } from './diffusionKernels';

interface DiffuseInput {
  readonly level: (x: number, y: number) => number;
  readonly width: number;
  readonly height: number;
  readonly kernel: DiffusionKernel | undefined;
}

interface DiffuseState {
  readonly errors: Float64Array;
  readonly bits: readonly number[];
}

const spread = (
  input: DiffuseInput,
  errors: Float64Array,
  index: number,
  error: number
): Float64Array => {
  const x = index % input.width;
  const y = Math.floor(index / input.width);
  return (input.kernel?.taps ?? []).reduce((current, [dx, dy, weight]) => {
    const tx = x + dx;
    const ty = y + dy;
    if (tx < 0 || tx >= input.width || ty >= input.height) {
      return current;
    }
    const target = ty * input.width + tx;
    return current.with(
      target,
      (current[target] ?? 0) + (error * weight) / (input.kernel?.divisor ?? 1)
    );
  }, errors);
};

export const errorDiffuse = (input: DiffuseInput): Uint8Array => {
  const pixels = input.width * input.height;
  const final = Array.from({ length: pixels }, (_, index) => index).reduce<DiffuseState>(
    (state, index) => {
      const value =
        input.level(index % input.width, Math.floor(index / input.width)) +
        (state.errors[index] ?? 0);
      const bit = value >= 0.5 ? 1 : 0;
      return {
        errors: spread(input, state.errors, index, value - bit),
        bits: [...state.bits, bit]
      };
    },
    { errors: new Float64Array(pixels), bits: [] }
  );
  return Uint8Array.from(final.bits);
};
