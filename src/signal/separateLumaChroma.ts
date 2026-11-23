import { notch } from './notch';
import { Separation } from './separation';
import { sampleAt } from './sampleAt';

interface SeparationInput {
  readonly rows: readonly Float64Array[];
  readonly index: number;
  readonly stride: number;
  readonly separation: Separation;
  readonly subcarrierHz: number;
  readonly sampleRateHz: number;
}

interface LumaChroma {
  readonly luma: Float64Array;
  readonly chroma: Float64Array;
}

const chromaBand = (signal: Float64Array, input: SeparationInput): Float64Array => {
  const trapped = notch(signal, input.subcarrierHz, input.sampleRateHz);
  return signal.map((value, n) => value - sampleAt(trapped, n));
};

const fromChroma = (line: Float64Array, chroma: Float64Array): LumaChroma => ({
  luma: line.map((value, n) => value - sampleAt(chroma, n)),
  chroma
});

const combDifference = (input: SeparationInput, line: Float64Array): Float64Array | null => {
  const up = input.rows[input.index - input.stride];
  const down = input.rows[input.index + input.stride];
  if (input.separation === Separation.Comb1) {
    return up === undefined ? null : line.map((value, n) => (value - sampleAt(up, n)) / 2);
  }
  if (up === undefined || down === undefined) {
    return null;
  }
  return line.map((value, n) => (2 * value - sampleAt(up, n) - sampleAt(down, n)) / 4);
};

export const separateLumaChroma = (input: SeparationInput): LumaChroma => {
  const line = input.rows[input.index] ?? new Float64Array(0);
  const difference = input.separation === Separation.Notch ? null : combDifference(input, line);
  return fromChroma(line, chromaBand(difference ?? line, input));
};
