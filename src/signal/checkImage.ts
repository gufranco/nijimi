import { CheckOutcome } from './checkOutcome';
import { CONSOLE_CAPABILITIES } from './consoleCapabilities';
import { ConsolePreset } from './consolePreset';
import { drawnBy } from './drawnBy';
import { neededModes } from './neededModes';
import { paletteStats } from './paletteStats';
import { regionOf } from './regionOf';
import type { SpecialMode } from './specialMode';
import type {
  ColorStats,
  ConsoleCapability,
  ConsoleReport,
  ResolutionCheck,
  Tier,
  TierCheck
} from './types';
import type { VideoStandard } from './videoStandard';

const FULL_LEVELS = 256;

interface CheckInput {
  readonly width: number;
  readonly height: number;
  readonly stats: ColorStats;
  readonly presence: Uint32Array | null;
  readonly preset: ConsolePreset;
  readonly standard: VideoStandard;
}

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

const resolutionOutcome = (needs: readonly SpecialMode[] | undefined): CheckOutcome => {
  if (needs === undefined) {
    return CheckOutcome.Fail;
  }
  return needs.length === 0 ? CheckOutcome.Pass : CheckOutcome.NeedsMode;
};

const checkResolution = (capability: ConsoleCapability, input: CheckInput): ResolutionCheck => {
  const needs = neededModes(capability, input);
  return {
    outcome: resolutionOutcome(needs),
    width: input.width,
    height: input.height,
    needs: needs ?? [],
    fitting: drawnBy(input)
  };
};

const statsOf = (capability: ConsoleCapability, input: CheckInput): ColorStats =>
  input.presence === null
    ? input.stats
    : paletteStats(input.presence, capability.levels?.[0].limit ?? FULL_LEVELS);

export const checkImage = (input: CheckInput): ConsoleReport | null => {
  if (input.preset === ConsolePreset.Custom) {
    return null;
  }
  const capability = CONSOLE_CAPABILITIES[input.preset];
  const stats = statsOf(capability, input);
  return {
    resolution: checkResolution(capability, input),
    colors: checkTiers(stats.colors, capability.colors[regionOf(input.standard)]),
    levels: checkTiers(stats.levels, capability.levels),
    lossy: input.presence !== null
  };
};
