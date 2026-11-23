import type { SamplingPlan } from './types';

const BASE_SAMPLES_PER_CYCLE = 4;
const MAX_SAMPLES_PER_CYCLE = 16;
const MIN_SAMPLES_PER_PIXEL = 2;
const EDGE_EPSILON = 1e-9;

export const samplingPlan = (input: {
  readonly dotClockHz: number;
  readonly subcarrierHz: number;
  readonly pixels: number;
}): SamplingPlan => {
  const needed = (MIN_SAMPLES_PER_PIXEL * input.dotClockHz) / input.subcarrierHz;
  const steps = Math.ceil(needed / BASE_SAMPLES_PER_CYCLE);
  const samplesPerCycle = Math.min(
    MAX_SAMPLES_PER_CYCLE,
    BASE_SAMPLES_PER_CYCLE * Math.max(1, steps)
  );
  const sampleRateHz = samplesPerCycle * input.subcarrierHz;
  const samplesPerPixel = sampleRateHz / input.dotClockHz;
  return {
    samplesPerCycle,
    sampleRateHz,
    samplesPerPixel,
    width: Math.ceil(input.pixels * samplesPerPixel - EDGE_EPSILON)
  };
};
