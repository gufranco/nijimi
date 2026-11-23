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
const TMS9918_CRYSTAL_HZ = 10_738_635;
const TMS_NTSC_MASTER_CYCLES = 3;
const TMS_LINE_MASTER = 684;
const TMS_DOT_DIVIDER = 2;
const LINES_625_TMS = 313;
const TIA_PAL_CLOCK_HZ = 3_546_894;
const TIA_LINE_CLOCKS = 228;
const MARIA_NTSC_MASTER_CYCLES = 2;
const MARIA_PAL_MASTER_CYCLES = 1.6;
const MARIA_LINE_MASTER = 454;
const MARIA_NTSC_LINES = 263;
const ANTIC_NTSC_MASTER_CYCLES = 4;
const ANTIC_PAL_MASTER_CYCLES = 3.2;
const ANTIC_LINE_MASTER = 912;
const VI_NTSC_MASTER_CYCLES = 13.6;
const VI_PAL_MASTER_CYCLES = 11.2;
const VI_NTSC_LINE_MASTER = 3094;
const VI_PAL_LINE_MASTER = 3178;
const VI_NTSC_LINES = 263;
const SATURN_CLOCK_1_NTSC_CYCLES = 7.5;
const SATURN_CLOCK_2_NTSC_CYCLES = 8;
const SATURN_CLOCK_1_PAL_HZ = 26_687_500;
const SATURN_CLOCK_2_PAL_HZ = 28_437_500;
const SATURN_LINE_1_DOTS = 427;
const SATURN_LINE_2_DOTS = 455;
const SATURN_LORES_DIVIDER = 4;
const SQUARE_NTSC_MASTER_CYCLES = 12 / 7;
const SQUARE_PAL_DOT_HZ = 7_375_000;
const NTSC_LINE_CYCLES = 227.5;
const PAL_LINE_CYCLES = 283.75;
const JAGUAR_NTSC_MASTER_CYCLES = 52 / 7;
const JAGUAR_PAL_CLOCK_HZ = 26_593_900;
const JAGUAR_NTSC_LINE_MASTER = 1690;
const JAGUAR_PAL_LINE_MASTER = 1702;

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

const maria = (dotDivider: number): RegionTimings => ({
  ntsc: timing(MARIA_NTSC_MASTER_CYCLES, dotDivider, MARIA_LINE_MASTER, MARIA_NTSC_LINES),
  pal: timing(MARIA_PAL_MASTER_CYCLES, dotDivider, MARIA_LINE_MASTER, LINES_625_TMS)
});

const antic = (dotDivider: number): RegionTimings => ({
  ntsc: timing(ANTIC_NTSC_MASTER_CYCLES, dotDivider, ANTIC_LINE_MASTER, LINES_525),
  pal: timing(ANTIC_PAL_MASTER_CYCLES, dotDivider, ANTIC_LINE_MASTER, LINES_625)
});

const videoInterface = (dotDivider: number): RegionTimings => ({
  ntsc: timing(VI_NTSC_MASTER_CYCLES, dotDivider, VI_NTSC_LINE_MASTER, VI_NTSC_LINES),
  pal: timing(VI_PAL_MASTER_CYCLES, dotDivider, VI_PAL_LINE_MASTER, LINES_625_TMS)
});

const saturn = (clock: 1 | 2, dotDivider: number): RegionTimings => {
  const lineMaster = (clock === 1 ? SATURN_LINE_1_DOTS : SATURN_LINE_2_DOTS) * SATURN_LORES_DIVIDER;
  return {
    ntsc: timing(
      clock === 1 ? SATURN_CLOCK_1_NTSC_CYCLES : SATURN_CLOCK_2_NTSC_CYCLES,
      dotDivider,
      lineMaster,
      VI_NTSC_LINES
    ),
    pal: timing(
      (clock === 1 ? SATURN_CLOCK_1_PAL_HZ : SATURN_CLOCK_2_PAL_HZ) /
        STANDARDS[VideoStandard.PalBg].subcarrierHz,
      dotDivider,
      lineMaster,
      LINES_625_TMS
    )
  };
};

const squarePixels = (): RegionTimings => {
  const palMaster = SQUARE_PAL_DOT_HZ / STANDARDS[VideoStandard.PalBg].subcarrierHz;
  return {
    ntsc: timing(
      SQUARE_NTSC_MASTER_CYCLES,
      1,
      NTSC_LINE_CYCLES * SQUARE_NTSC_MASTER_CYCLES,
      VI_NTSC_LINES
    ),
    pal: timing(palMaster, 1, PAL_LINE_CYCLES * palMaster, LINES_625_TMS)
  };
};

const jaguar = (dotDivider: number): RegionTimings => ({
  ntsc: timing(JAGUAR_NTSC_MASTER_CYCLES, dotDivider, JAGUAR_NTSC_LINE_MASTER, LINES_525),
  pal: timing(
    JAGUAR_PAL_CLOCK_HZ / STANDARDS[VideoStandard.PalBg].subcarrierHz,
    dotDivider,
    JAGUAR_PAL_LINE_MASTER,
    LINES_625
  )
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
  [ConsolePreset.Ps1W320]: ps1(8),
  [ConsolePreset.Ps1W368]: ps1(7),
  [ConsolePreset.Ps1W512]: ps1(5),
  [ConsolePreset.Ps1W640]: ps1(4),
  [ConsolePreset.Sg1000]: {
    ntsc: timing(TMS_NTSC_MASTER_CYCLES, TMS_DOT_DIVIDER, TMS_LINE_MASTER, LINES_525),
    pal: timing(
      TMS9918_CRYSTAL_HZ / STANDARDS[VideoStandard.PalBg].subcarrierHz,
      TMS_DOT_DIVIDER,
      TMS_LINE_MASTER,
      LINES_625_TMS
    )
  },
  [ConsolePreset.Sega32x]: sega(8),
  [ConsolePreset.Atari2600]: {
    ntsc: timing(1, 1, TIA_LINE_CLOCKS, LINES_525),
    pal: timing(
      TIA_PAL_CLOCK_HZ / STANDARDS[VideoStandard.PalBg].subcarrierHz,
      1,
      TIA_LINE_CLOCKS,
      LINES_625
    )
  },
  [ConsolePreset.Atari7800W160]: maria(2),
  [ConsolePreset.Atari7800W320]: maria(1),
  [ConsolePreset.Atari5200W160]: antic(4),
  [ConsolePreset.Atari5200W320]: antic(2),
  [ConsolePreset.N64W320]: videoInterface(8),
  [ConsolePreset.N64W640]: videoInterface(4),
  [ConsolePreset.SaturnW320]: saturn(1, 4),
  [ConsolePreset.SaturnW352]: saturn(2, 4),
  [ConsolePreset.SaturnW640]: saturn(1, 2),
  [ConsolePreset.SaturnW704]: saturn(2, 2),
  [ConsolePreset.GameBoy]: squarePixels(),
  [ConsolePreset.GameBoyPocket]: squarePixels(),
  [ConsolePreset.GameBoyColor]: squarePixels(),
  [ConsolePreset.GameGear]: squarePixels(),
  [ConsolePreset.JaguarW256]: jaguar(5),
  [ConsolePreset.JaguarW320]: jaguar(4)
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
