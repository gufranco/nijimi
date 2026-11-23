import { seededGaussian } from './seededGaussian';
import type { RfSettings, RowContext, StandardSpec } from './types';
import { sampleAt } from './sampleAt';

const GHOST_DELAY_SECONDS = 1.5e-6;
const GHOST_MAX_GAIN = 0.35;
const BEAT_MAX_AMPLITUDE = 0.06;
const NOISE_MAX_SIGMA = 0.1;

export const rfChannel = (input: {
  readonly composite: Float64Array;
  readonly rf: RfSettings;
  readonly context: RowContext;
  readonly spec: StandardSpec;
  readonly sampleRateHz: number;
}): Float64Array => {
  const delay = Math.round(GHOST_DELAY_SECONDS * input.sampleRateHz);
  const ghostGain = input.rf.ghost * GHOST_MAX_GAIN;
  const beatHz = input.spec.soundCarrierHz - input.spec.subcarrierHz;
  const beatAmplitude = input.rf.beat * BEAT_MAX_AMPLITUDE;
  const sigma = input.rf.noise * NOISE_MAX_SIGMA;
  const noise = seededGaussian(input.context.seed, sigma > 0 ? input.composite.length : 0);
  return input.composite.map((value, n) => {
    const echo = n >= delay ? ghostGain * sampleAt(input.composite, n - delay) : 0;
    const seconds = input.context.lineSeconds + n / input.sampleRateHz;
    const beat = beatAmplitude * Math.sin(2 * Math.PI * beatHz * seconds);
    return value + echo + beat + sigma * sampleAt(noise, n);
  });
};
