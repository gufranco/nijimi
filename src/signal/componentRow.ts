import { lowpass } from './lowpass';
import { pixelsToYuv } from './pixelsToYuv';
import { resampleRow } from './resampleRow';
import type { SamplingPlan } from './types';
import { yuvRowToRgb } from './yuvRowToRgb';

const COMPONENT_LUMA_BANDWIDTH_HZ = 5.75e6;
const COMPONENT_CHROMA_BANDWIDTH_HZ = 2.75e6;

export const componentRow = (input: {
  readonly pixels: Float32Array;
  readonly plan: SamplingPlan;
  readonly saturation: number;
}): Float32Array => {
  const row = pixelsToYuv(input.pixels);
  const band = (plane: Float64Array, bandwidthHz: number): Float64Array =>
    lowpass(resampleRow(plane, input.plan.samplesPerPixel), bandwidthHz, input.plan.sampleRateHz);
  return yuvRowToRgb(
    {
      y: band(row.y, COMPONENT_LUMA_BANDWIDTH_HZ),
      u: band(row.u, COMPONENT_CHROMA_BANDWIDTH_HZ),
      v: band(row.v, COMPONENT_CHROMA_BANDWIDTH_HZ)
    },
    input.saturation
  );
};
