import { CheckOutcome } from './checkOutcome';
import { CONSOLE_CAPABILITIES } from './consoleCapabilities';
import { ConsolePreset } from './consolePreset';
import type { SpecialMode } from './specialMode';
import type {
  ColorStats,
  ConsoleCapability,
  ConsoleReport,
  ResolutionCheck,
  Tier,
  TierCheck
} from './types';
import { VideoStandard } from './videoStandard';

type ListedPreset = Exclude<ConsolePreset, ConsolePreset.Custom>;

interface CheckInput {
  readonly width: number;
  readonly height: number;
  readonly stats: ColorStats;
  readonly preset: ConsolePreset;
  readonly standard: VideoStandard;
}

const LISTED = Object.values(ConsolePreset).filter(
  (preset): preset is ListedPreset => preset !== ConsolePreset.Custom
);

const regionOf = (standard: VideoStandard): 'ntsc' | 'pal' =>
  standard === VideoStandard.PalBg ? 'pal' : 'ntsc';

const checkTiers = (found: number, tiers: ConsoleCapability['levels']): TierCheck => {
  if (tiers === null) {
    return { outcome: CheckOutcome.NotApplicable, found, limit: 0, needs: null };
  }
  const fitting: Tier | undefined = tiers.find((candidate) => found <= candidate.limit);
  if (fitting === undefined) {
    return {
      outcome: CheckOutcome.Fail,
      found,
      limit: Math.max(...tiers.map((candidate) => candidate.limit)),
      needs: null
    };
  }
  return {
    outcome: fitting.needs === null ? CheckOutcome.Pass : CheckOutcome.NeedsMode,
    found,
    limit: fitting.limit,
    needs: fitting.needs
  };
};

const neededModes = (
  capability: ConsoleCapability,
  input: CheckInput
): readonly SpecialMode[] | undefined => {
  const region = regionOf(input.standard);
  const width = capability.widths.find((rule) => rule.width === input.width);
  const height = capability.heights[region].find(
    (rule) => input.height >= rule.min && input.height <= rule.max
  );
  return width === undefined || height === undefined
    ? undefined
    : [...width.needs, ...height.needs];
};

const resolutionOutcome = (needs: readonly SpecialMode[] | undefined): CheckOutcome => {
  if (needs === undefined) {
    return CheckOutcome.Fail;
  }
  return needs.length === 0 ? CheckOutcome.Pass : CheckOutcome.NeedsMode;
};

const checkResolution = (capability: ConsoleCapability, input: CheckInput): ResolutionCheck => {
  const needs = neededModes(capability, input);
  const fitting = LISTED.filter(
    (preset) => neededModes(CONSOLE_CAPABILITIES[preset], input) !== undefined
  );
  return {
    outcome: resolutionOutcome(needs),
    width: input.width,
    height: input.height,
    needs: needs ?? [],
    fitting
  };
};

export const checkImage = (input: CheckInput): ConsoleReport | null => {
  if (input.preset === ConsolePreset.Custom) {
    return null;
  }
  const capability = CONSOLE_CAPABILITIES[input.preset];
  return {
    resolution: checkResolution(capability, input),
    colors: checkTiers(input.stats.colors, capability.colors[regionOf(input.standard)]),
    levels: checkTiers(input.stats.levels, capability.levels)
  };
};
