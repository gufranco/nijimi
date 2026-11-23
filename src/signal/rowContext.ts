import { lineCycles } from './lineCycles';
import { ScanMode } from './scanMode';
import type { LineTiming, RowContext, StandardSpec } from './types';

const SEED_FRAME_PRIME = 0x9e3779b1;
const SEED_ROW_PRIME = 0x85ebca6b;

export const rowContext = (input: {
  readonly timing: LineTiming;
  readonly spec: StandardSpec;
  readonly scan: ScanMode;
  readonly frameIndex: number;
  readonly row: number;
  readonly seed: number;
}): RowContext => {
  const line = input.scan === ScanMode.Interlaced ? Math.floor(input.row / 2) : input.row;
  const absoluteLine = input.frameIndex * input.timing.linesPerFrame + line;
  const switched = input.spec.lineAlternation && absoluteLine % 2 === 1;
  return {
    cycles: lineCycles(input.timing, input.frameIndex, line),
    lineSwitch: switched ? -1 : 1,
    seed:
      (input.seed ^
        Math.imul(input.frameIndex + 1, SEED_FRAME_PRIME) ^
        Math.imul(input.row + 1, SEED_ROW_PRIME)) >>>
      0,
    lineSeconds: (line * input.timing.cyclesPerLine) / input.spec.subcarrierHz
  };
};
