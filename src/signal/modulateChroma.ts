import { sampleAt } from './sampleAt';

const TWO_PI = 2 * Math.PI;

export const modulateChroma = (input: {
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly cycles: number;
  readonly samplesPerCycle: number;
  readonly lineSwitch: number;
}): Float64Array =>
  input.u.map((u, n) => {
    const theta = TWO_PI * (input.cycles + n / input.samplesPerCycle);
    return u * Math.sin(theta) + input.lineSwitch * sampleAt(input.v, n) * Math.cos(theta);
  });
