import { interleave } from './interleave';
import { lowpass } from './lowpass';
import { resampleRow } from './resampleRow';
import { sampleAt } from './sampleAt';
import type { SamplingPlan } from './types';

const CHANNELS = 3;

const channelSamples = (input: RgbRowInput, channel: number): Float64Array => {
  const plane = Float64Array.from({ length: input.pixels.length / CHANNELS }, (_, index) =>
    sampleAt(input.pixels, index * CHANNELS + channel)
  );
  return lowpass(
    resampleRow(plane, input.plan.samplesPerPixel),
    input.bandwidthHz,
    input.plan.sampleRateHz
  );
};

interface RgbRowInput {
  readonly pixels: Float32Array;
  readonly plan: SamplingPlan;
  readonly bandwidthHz: number;
}

export const rgbRow = (input: RgbRowInput): Float32Array =>
  interleave(channelSamples(input, 0), channelSamples(input, 1), channelSamples(input, 2));
