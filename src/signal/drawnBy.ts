import { CONSOLE_CAPABILITIES } from './consoleCapabilities';
import { ConsolePreset } from './consolePreset';
import { neededModes } from './neededModes';
import type { VideoStandard } from './videoStandard';

export type ListedPreset = Exclude<ConsolePreset, ConsolePreset.Custom>;

const LISTED = Object.values(ConsolePreset).filter(
  (preset): preset is ListedPreset => preset !== ConsolePreset.Custom
);

export const drawnBy = (input: {
  readonly width: number;
  readonly height: number;
  readonly standard: VideoStandard;
}): readonly ListedPreset[] =>
  LISTED.filter((preset) => neededModes(CONSOLE_CAPABILITIES[preset], input) !== undefined);
