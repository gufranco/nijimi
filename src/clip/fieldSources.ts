import { sampleAt } from '../signal/sampleAt';
import { fieldCount } from './fieldCount';

export const fieldSources = (input: {
  readonly times: readonly number[];
  readonly duration: number;
  readonly fieldRate: number;
}): Uint32Array => {
  const fields = fieldCount(input.duration, input.fieldRate);
  let source = 0;
  return Uint32Array.from({ length: fields }, (_, field) => {
    const seconds = field / input.fieldRate;
    while (source + 1 < input.times.length && sampleAt(input.times, source + 1) <= seconds) {
      source += 1;
    }
    return source;
  });
};
