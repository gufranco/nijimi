import type { RgbFrame } from '../../src/signal/types';

export type Rgb = readonly [number, number, number];

export const patternFrame = (input: {
  readonly mask: Uint8Array;
  readonly width: number;
  readonly palette: readonly Rgb[];
}): RgbFrame => ({
  width: input.width,
  height: input.mask.length / input.width,
  data: Float32Array.from(
    Array.from(input.mask, (level) => input.palette[level] ?? [0, 0, 0]).flat()
  )
});
