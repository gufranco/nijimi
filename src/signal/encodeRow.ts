import { bandlimitChroma } from './bandlimitChroma';
import { modulateChroma } from './modulateChroma';
import { pixelsToYuv } from './pixelsToYuv';
import { resampleRow } from './resampleRow';
import type { RowContext, SamplingPlan, StandardSpec } from './types';

export const encodeRow = (input: {
  readonly pixels: Float32Array;
  readonly plan: SamplingPlan;
  readonly spec: StandardSpec;
  readonly context: RowContext;
}): { readonly luma: Float64Array; readonly chroma: Float64Array } => {
  const row = pixelsToYuv(input.pixels);
  const chroma = bandlimitChroma({
    u: resampleRow(row.u, input.plan.samplesPerPixel),
    v: resampleRow(row.v, input.plan.samplesPerPixel),
    spec: input.spec,
    sampleRateHz: input.plan.sampleRateHz
  });
  return {
    luma: resampleRow(row.y, input.plan.samplesPerPixel),
    chroma: modulateChroma({
      u: chroma.u,
      v: chroma.v,
      cycles: input.context.cycles,
      samplesPerCycle: input.plan.samplesPerCycle,
      lineSwitch: input.context.lineSwitch
    })
  };
};
