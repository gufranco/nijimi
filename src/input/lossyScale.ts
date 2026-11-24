import type { ConsolePreset } from '../signal/consolePreset';
import { drawnBy } from '../signal/drawnBy';
import type { VideoStandard } from '../signal/videoStandard';

const MAX_SCALE = 8;

export const lossyScale = (input: {
  readonly width: number;
  readonly height: number;
  readonly preset: ConsolePreset;
  readonly standard: VideoStandard;
}): number => {
  const candidates = Array.from({ length: MAX_SCALE - 1 }, (_, index) => MAX_SCALE - index).filter(
    (scale) => input.width % scale === 0 && input.height % scale === 0
  );
  const drawn = (scale: number): readonly ConsolePreset[] =>
    drawnBy({ width: input.width / scale, height: input.height / scale, standard: input.standard });
  const mostDrawn = candidates.reduce(
    (best, scale) => (drawn(scale).length > drawn(best).length ? scale : best),
    1
  );
  return candidates.find((scale) => drawn(scale).includes(input.preset)) ?? mostDrawn;
};
