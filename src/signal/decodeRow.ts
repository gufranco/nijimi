import { demodulateChroma } from './demodulateChroma';
import { lowpass } from './lowpass';
import type { RowContext, StandardSpec, YuvRow } from './types';

export const decodeRow = (input: {
  readonly luma: Float64Array;
  readonly chroma: Float64Array;
  readonly context: RowContext;
  readonly spec: StandardSpec;
  readonly sampleRateHz: number;
  readonly samplesPerCycle: number;
  readonly hueRadians: number;
  readonly lumaBandwidthHz: number;
}): YuvRow => {
  const raw = demodulateChroma({
    chroma: input.chroma,
    cycles: input.context.cycles,
    samplesPerCycle: input.samplesPerCycle,
    hueRadians: input.hueRadians
  });
  const v = lowpass(raw.v, input.spec.chromaBandwidthHz, input.sampleRateHz);
  return {
    y: lowpass(input.luma, input.lumaBandwidthHz, input.sampleRateHz),
    u: lowpass(raw.u, input.spec.chromaBandwidthHz, input.sampleRateHz),
    v: v.map((value) => value * input.context.lineSwitch)
  };
};
