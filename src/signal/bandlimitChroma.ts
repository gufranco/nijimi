import { lowpass } from './lowpass';
import { sampleAt } from './sampleAt';
import type { StandardSpec } from './types';

const IQ_ANGLE_RADIANS = (33 * Math.PI) / 180;
const SIN = Math.sin(IQ_ANGLE_RADIANS);
const COS = Math.cos(IQ_ANGLE_RADIANS);

interface ChromaPair {
  readonly u: Float64Array;
  readonly v: Float64Array;
}

const rotate = (pair: ChromaPair): ChromaPair => ({
  u: pair.u.map((a, n) => -SIN * a + COS * sampleAt(pair.v, n)),
  v: pair.u.map((a, n) => COS * a + SIN * sampleAt(pair.v, n))
});

export const bandlimitChroma = (input: {
  readonly u: Float64Array;
  readonly v: Float64Array;
  readonly spec: StandardSpec;
  readonly sampleRateHz: number;
}): ChromaPair => {
  if (!input.spec.iqAxes) {
    return {
      u: lowpass(input.u, input.spec.chromaBandwidthHz, input.sampleRateHz),
      v: lowpass(input.v, input.spec.chromaBandwidthHz, input.sampleRateHz)
    };
  }
  const iq = rotate(input);
  return rotate({
    u: lowpass(iq.u, input.spec.chromaBandwidthHz, input.sampleRateHz),
    v: lowpass(iq.v, input.spec.narrowChromaBandwidthHz, input.sampleRateHz)
  });
};
