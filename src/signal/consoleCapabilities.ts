import { ConsolePreset } from './consolePreset';
import { SpecialMode } from './specialMode';
import type { ConsoleCapability, HeightRule, Tier, WidthRule } from './types';

type ListedPreset = Exclude<ConsolePreset, ConsolePreset.Custom>;

const COLORS_15_BIT = 32_768;
const COLORS_24_BIT = 16_777_216;
const LEVELS_5_BIT = 32;
const LEVELS_8_BIT = 256;

const exact = (lines: number, ...needs: readonly SpecialMode[]): HeightRule => ({
  min: lines,
  max: lines,
  needs
});

const upTo = (min: number, max: number, ...needs: readonly SpecialMode[]): HeightRule => ({
  min,
  max,
  needs
});

const wide = (width: number, ...needs: readonly SpecialMode[]): WidthRule => ({ width, needs });

const everywhere = (
  ...tiers: readonly [Tier, ...Tier[]]
): Readonly<Record<'ntsc' | 'pal', readonly [Tier, ...Tier[]]>> => ({ ntsc: tiers, pal: tiers });

const tier = (limit: number, needs: SpecialMode | null = null): Tier => ({ limit, needs });

const snesLines: readonly HeightRule[] = [
  exact(224),
  exact(239),
  exact(448, SpecialMode.Interlace),
  exact(478, SpecialMode.Interlace)
];

const genesis = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: {
    ntsc: [exact(224), exact(448, SpecialMode.Interlace)],
    pal: [
      exact(224),
      exact(240, SpecialMode.PalV30),
      exact(448, SpecialMode.Interlace),
      exact(480, SpecialMode.PalV30, SpecialMode.Interlace)
    ]
  },
  colors: everywhere(tier(61), tier(183, SpecialMode.ShadowHighlight)),
  levels: [tier(8), tier(15, SpecialMode.ShadowHighlight)]
});

const atari7800 = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: { ntsc: [upTo(1, 240)], pal: [upTo(1, 260)] },
  colors: everywhere(tier(25)),
  levels: null
});

const atari5200 = (scale: number): ConsoleCapability => ({
  widths: [wide(128 * scale), wide(160 * scale), wide(192 * scale)],
  heights: { ntsc: [upTo(1, 240)], pal: [upTo(1, 240)] },
  colors: everywhere(
    tier(9),
    tier(128, SpecialMode.PerLineColors),
    tier(256, SpecialMode.GtiaLuminanceMode)
  ),
  levels: null
});

const n64 = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: {
    ntsc: [upTo(1, 240), upTo(241, 480, SpecialMode.Interlace)],
    pal: [upTo(1, 240), upTo(241, 480, SpecialMode.Interlace)]
  },
  colors: everywhere(tier(COLORS_15_BIT), tier(COLORS_24_BIT, SpecialMode.Framebuffer32Bit)),
  levels: [tier(LEVELS_5_BIT), tier(LEVELS_8_BIT, SpecialMode.Framebuffer32Bit)]
});

const saturn = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: {
    ntsc: [
      exact(224),
      exact(240),
      exact(448, SpecialMode.Interlace),
      exact(480, SpecialMode.Interlace)
    ],
    pal: [
      exact(224),
      exact(240),
      exact(256),
      exact(448, SpecialMode.Interlace),
      exact(480, SpecialMode.Interlace),
      exact(512, SpecialMode.Interlace)
    ]
  },
  colors: everywhere(tier(2048)),
  levels: [tier(LEVELS_5_BIT), tier(LEVELS_8_BIT, SpecialMode.SaturnCram24Bit)]
});

const handheld = (colors: number, levels: number | null): ConsoleCapability => ({
  widths: [wide(160)],
  heights: { ntsc: [exact(144)], pal: [exact(144)] },
  colors: everywhere(tier(colors)),
  levels: levels === null ? null : [tier(levels)]
});

const jaguar = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: {
    ntsc: [upTo(1, 240), upTo(241, 480, SpecialMode.Interlace)],
    pal: [upTo(1, 288), upTo(289, 576, SpecialMode.Interlace)]
  },
  colors: everywhere(tier(65_536), tier(COLORS_24_BIT, SpecialMode.JaguarRgb24)),
  levels: [tier(64), tier(LEVELS_8_BIT, SpecialMode.JaguarRgb24)]
});

const playStation = (width: number): ConsoleCapability => ({
  widths: [wide(width)],
  heights: {
    ntsc: [upTo(1, 240), upTo(241, 480, SpecialMode.Interlace)],
    pal: [upTo(1, 288), upTo(289, 576, SpecialMode.Interlace)]
  },
  colors: everywhere(tier(COLORS_15_BIT), tier(COLORS_24_BIT, SpecialMode.Display24Bit)),
  levels: [tier(LEVELS_5_BIT), tier(LEVELS_8_BIT, SpecialMode.Display24Bit)]
});

export const CONSOLE_CAPABILITIES: Readonly<Record<ListedPreset, ConsoleCapability>> = {
  [ConsolePreset.Nes]: {
    widths: [wide(256)],
    heights: { ntsc: [exact(224), exact(240)], pal: [exact(224), exact(240)] },
    colors: everywhere(tier(25)),
    levels: null
  },
  [ConsolePreset.Snes256]: {
    widths: [wide(256)],
    heights: { ntsc: snesLines, pal: snesLines },
    colors: everywhere(tier(256), tier(COLORS_15_BIT, SpecialMode.SnesColorMathOrDirectColor)),
    levels: [tier(LEVELS_5_BIT)]
  },
  [ConsolePreset.Snes512]: {
    widths: [wide(512)],
    heights: { ntsc: snesLines, pal: snesLines },
    colors: everywhere(tier(256), tier(COLORS_15_BIT, SpecialMode.SnesColorMath)),
    levels: [tier(LEVELS_5_BIT)]
  },
  [ConsolePreset.GenesisH32]: genesis(256),
  [ConsolePreset.GenesisH40]: genesis(320),
  [ConsolePreset.MasterSystem]: {
    widths: [wide(256)],
    heights: {
      ntsc: [exact(192), exact(224, SpecialMode.Sms2Vdp), exact(240, SpecialMode.Sms2Vdp)],
      pal: [exact(192), exact(224, SpecialMode.Sms2Vdp), exact(240, SpecialMode.Sms2Vdp)]
    },
    colors: everywhere(tier(32)),
    levels: [tier(4)]
  },
  [ConsolePreset.Ps1W256]: playStation(256),
  [ConsolePreset.Ps1W320]: playStation(320),
  [ConsolePreset.Ps1W368]: playStation(368),
  [ConsolePreset.Ps1W512]: playStation(512),
  [ConsolePreset.Ps1W640]: playStation(640),
  [ConsolePreset.Sg1000]: {
    widths: [wide(256), wide(240, SpecialMode.TextMode)],
    heights: { ntsc: [exact(192)], pal: [exact(192)] },
    colors: everywhere(tier(15)),
    levels: null
  },
  [ConsolePreset.Sega32x]: {
    widths: [wide(320)],
    heights: { ntsc: [exact(224)], pal: [exact(240)] },
    colors: everywhere(tier(256), tier(COLORS_15_BIT, SpecialMode.DirectColor32x)),
    levels: [tier(LEVELS_5_BIT)]
  },
  [ConsolePreset.Atari2600]: {
    widths: [wide(160)],
    heights: {
      ntsc: [exact(192), upTo(1, 259, SpecialMode.CustomLineCount)],
      pal: [exact(228), upTo(1, 309, SpecialMode.CustomLineCount)]
    },
    colors: {
      ntsc: [tier(4), tier(128, SpecialMode.PerLineColors)],
      pal: [tier(4), tier(104, SpecialMode.PerLineColors)]
    },
    levels: null
  },
  [ConsolePreset.Atari7800W160]: atari7800(160),
  [ConsolePreset.Atari7800W320]: atari7800(320),
  [ConsolePreset.Atari5200W160]: atari5200(1),
  [ConsolePreset.Atari5200W320]: atari5200(2),
  [ConsolePreset.N64W320]: n64(320),
  [ConsolePreset.N64W640]: n64(640),
  [ConsolePreset.SaturnW320]: saturn(320),
  [ConsolePreset.SaturnW352]: saturn(352),
  [ConsolePreset.SaturnW640]: saturn(640),
  [ConsolePreset.SaturnW704]: saturn(704),
  [ConsolePreset.GameBoy]: handheld(4, null),
  [ConsolePreset.GameBoyPocket]: handheld(4, null),
  [ConsolePreset.GameBoyColor]: handheld(56, LEVELS_5_BIT),
  [ConsolePreset.GameGear]: handheld(32, 16),
  [ConsolePreset.JaguarW256]: jaguar(256),
  [ConsolePreset.JaguarW320]: jaguar(320)
};
