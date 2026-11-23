import { lineCycles } from './lineCycles';
import { ScanMode } from './scanMode';
import type { LineTiming } from './types';

const MAX_FRAMES = 12;
const PHASE_TOLERANCE = 1e-6;

const sameStart = (timing: LineTiming, period: number): boolean =>
  [0, 1].every((frame) => {
    const delta = Math.abs(lineCycles(timing, frame + period, 0) - lineCycles(timing, frame, 0));
    return Math.min(delta, 1 - delta) < PHASE_TOLERANCE;
  });

const phasePeriod = (timing: LineTiming): number =>
  Array.from({ length: MAX_FRAMES }, (_, index) => index + 1).find((period) =>
    sameStart(timing, period)
  ) ?? MAX_FRAMES;

const MAX_EUCLID_STEPS = 64;

const gcd = (a: number, b: number): number => {
  let x = a;
  let y = b;
  for (let step = 0; step < MAX_EUCLID_STEPS && y !== 0; step += 1) {
    const remainder = x % y;
    x = y;
    y = remainder;
  }
  return x;
};

const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);

export const frameCycle = (input: {
  readonly timing: LineTiming;
  readonly scan: ScanMode;
  readonly sourceFrames: number;
}): number => {
  const fields = input.scan === ScanMode.Interlaced ? 2 : 1;
  const period = [fields, input.sourceFrames].reduce(lcm, phasePeriod(input.timing));
  return Math.min(MAX_FRAMES, period);
};
