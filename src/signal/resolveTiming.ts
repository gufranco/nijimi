import { ConsolePreset } from './consolePreset';
import { STANDARDS } from './standards';
import type { ConsoleTiming, CustomTiming, LineTiming } from './types';
import { VideoStandard } from './videoStandard';

const MASTER_6_CYCLES = 6;
const MASTER_15_CYCLES = 15;
const MASTER_12_CYCLES = 12;
const PAL_SNES_MASTER_CYCLES = 4.8;
const LINES_525 = 262;
const LINES_625 = 312;
const LINES_625_SEGA = 313;
const PS1_NTSC_LINES = 263;
const PS1_PAL_LINES = 314;
const SEGA_LINE_MASTER = 3420;
const SNES_LINE_MASTER = 1364;
const NES_PAL_LINE_MASTER = 1705;
const PS1_NTSC_LINE_MASTER = 3413;
const PS1_PAL_LINE_MASTER = 3406;
const ONE_DOT_6FSC_MASTER = 4;

type ListedPreset = Exclude<ConsolePreset, ConsolePreset.Custom>;
type RegionTimings = Readonly<Record<'ntsc' | 'pal', ConsoleTiming>>;

const timing = (
  masterPerCycle: number,
  dotDivider: number,
  masterPerLine: number,
  linesPerFrame: number,
  shortLineMaster = 0
): ConsoleTiming => ({ masterPerCycle, dotDivider, masterPerLine, linesPerFrame, shortLineMaster });

const sega = (dotDivider: number): RegionTimings => ({
  ntsc: timing(MASTER_15_CYCLES, dotDivider, SEGA_LINE_MASTER, LINES_525),
  pal: timing(MASTER_12_CYCLES, dotDivider, SEGA_LINE_MASTER, LINES_625_SEGA)
});

const snes = (dotDivider: number): RegionTimings => ({
  ntsc: timing(MASTER_6_CYCLES, dotDivider, SNES_LINE_MASTER, LINES_525, ONE_DOT_6FSC_MASTER),
  pal: timing(PAL_SNES_MASTER_CYCLES, dotDivider, SNES_LINE_MASTER, LINES_625)
});

const ps1 = (dotDivider: number): RegionTimings => ({
  ntsc: timing(MASTER_15_CYCLES, dotDivider, PS1_NTSC_LINE_MASTER, PS1_NTSC_LINES),
  pal: timing(MASTER_12_CYCLES, dotDivider, PS1_PAL_LINE_MASTER, PS1_PAL_LINES)
});

const TIMINGS: Readonly<Record<ListedPreset, RegionTimings>> = {
  [ConsolePreset.Nes]: {
    ntsc: timing(MASTER_6_CYCLES, 4, SNES_LINE_MASTER, LINES_525, ONE_DOT_6FSC_MASTER),
    pal: timing(MASTER_6_CYCLES, 5, NES_PAL_LINE_MASTER, LINES_625)
  },
  [ConsolePreset.Snes256]: snes(4),
  [ConsolePreset.Snes512]: snes(2),
  [ConsolePreset.GenesisH32]: sega(10),
  [ConsolePreset.GenesisH40]: sega(8),
  [ConsolePreset.MasterSystem]: sega(10),
  [ConsolePreset.Ps1W256]: ps1(10),
  [ConsolePreset.Ps1W320]: ps1(8)
};

const regionOf = (standard: VideoStandard): 'ntsc' | 'pal' =>
  standard === VideoStandard.PalBg ? 'pal' : 'ntsc';

const customTiming = (standard: VideoStandard, custom: CustomTiming): LineTiming => ({
  dotClockHz: custom.dotClockHz,
  cyclesPerLine: custom.cyclesPerLine,
  linesPerFrame: standard === VideoStandard.PalBg ? LINES_625 : LINES_525,
  shortLineCycles: 0
});

export const resolveTiming = (input: {
  readonly preset: ConsolePreset;
  readonly standard: VideoStandard;
  readonly custom: CustomTiming;
}): LineTiming => {
  if (input.preset === ConsolePreset.Custom) {
    return customTiming(input.standard, input.custom);
  }
  const machine = TIMINGS[input.preset][regionOf(input.standard)];
  return {
    dotClockHz:
      (STANDARDS[input.standard].subcarrierHz * machine.masterPerCycle) / machine.dotDivider,
    cyclesPerLine: machine.masterPerLine / machine.masterPerCycle,
    linesPerFrame: machine.linesPerFrame,
    shortLineCycles: machine.shortLineMaster / machine.masterPerCycle
  };
};
