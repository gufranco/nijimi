import { regionOf } from './regionOf';
import type { SpecialMode } from './specialMode';
import type { ConsoleCapability } from './types';
import type { VideoStandard } from './videoStandard';

export const neededModes = (
  capability: ConsoleCapability,
  input: { readonly width: number; readonly height: number; readonly standard: VideoStandard }
): readonly SpecialMode[] | undefined => {
  const width = capability.widths.find((rule) => rule.width === input.width);
  const height = capability.heights[regionOf(input.standard)].find(
    (rule) => input.height >= rule.min && input.height <= rule.max
  );
  return width === undefined || height === undefined
    ? undefined
    : [...width.needs, ...height.needs];
};
