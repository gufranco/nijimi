import type { MessageKey } from '../i18n/types';

export type OptionEntry =
  | { readonly value: string; readonly label: MessageKey }
  | { readonly value: string; readonly text: string };

const MAX_SCALE = 8;

export const OPTION_TABLES: Readonly<Record<string, readonly OptionEntry[]>> = {
  s: [
    { value: 'ntsc', label: 'standardNtsc' },
    { value: 'pal-bg', label: 'standardPalBg' },
    { value: 'pal-m', label: 'standardPalM' }
  ],
  p: [
    { value: 'nes', label: 'presetNes' },
    { value: 'snes-256', label: 'presetSnes256' },
    { value: 'snes-512', label: 'presetSnes512' },
    { value: 'genesis-h32', label: 'presetGenesisH32' },
    { value: 'genesis-h40', label: 'presetGenesisH40' },
    { value: 'sms', label: 'presetSms' },
    { value: 'ps1-256', label: 'presetPs1W256' },
    { value: 'ps1-320', label: 'presetPs1W320' },
    { value: 'custom', label: 'presetCustom' }
  ],
  sep: [
    { value: 'notch', label: 'separationNotch' },
    { value: 'comb1', label: 'separationComb1' },
    { value: 'comb2', label: 'separationComb2' }
  ],
  pal: [
    { value: 'simple', label: 'palSimple' },
    { value: 'delay-line', label: 'palDelayLine' }
  ],
  m: [
    { value: 'none', label: 'maskNone' },
    { value: 'aperture-grille', label: 'maskApertureGrille' },
    { value: 'slot-mask', label: 'maskSlotMask' },
    { value: 'shadow-mask', label: 'maskShadowMask' }
  ],
  view: [
    { value: 'average', label: 'frameAverage' },
    { value: 'single', label: 'frameSingle' }
  ],
  scan: [
    { value: 'progressive', label: 'scanProgressive' },
    { value: 'interlaced', label: 'scanInterlaced' }
  ],
  x: [
    { value: '0', label: 'scaleAuto' },
    ...Array.from({ length: MAX_SCALE }, (_, index) => ({
      value: String(index + 1),
      text: `${String(index + 1)}x`
    }))
  ]
};
