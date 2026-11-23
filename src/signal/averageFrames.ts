import { sampleAt } from './sampleAt';
import type { RenderedFrame } from './types';

const CHANNELS = 3;

const toLinear = (value: number, gamma: number): number =>
  Math.sign(value) * Math.abs(value) ** gamma;

const toSignal = (value: number, gamma: number): number =>
  Math.sign(value) * Math.abs(value) ** (1 / gamma);

const averageRow = (rows: readonly Float32Array[], width: number, gamma: number): Float32Array => {
  const [only, ...rest] = rows;
  if (only !== undefined && rest.length === 0) {
    return only;
  }
  return Float32Array.from({ length: width * CHANNELS }, (_, index) => {
    const sum = rows.reduce((total, row) => total + toLinear(sampleAt(row, index), gamma), 0);
    return rows.length === 0 ? 0 : toSignal(sum / rows.length, gamma);
  });
};

export const averageFrames = (input: {
  readonly frames: readonly RenderedFrame[];
  readonly width: number;
  readonly height: number;
  readonly gamma: number;
}): Float32Array => {
  const rowsAt = (row: number): readonly Float32Array[] =>
    input.frames.flatMap((frame) => {
      const lit = frame.rows[row];
      return lit === null || lit === undefined ? [] : [lit];
    });
  const output = new Float32Array(input.width * input.height * CHANNELS);
  Array.from({ length: input.height }, (_, row) =>
    averageRow(rowsAt(row), input.width, input.gamma)
  ).forEach((row, index) => {
    output.set(row, index * input.width * CHANNELS);
  });
  return output;
};
