import type { MessageKey } from '../i18n/types';
import { PRESET_LABELS } from './presetLabels';

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
  p: Object.entries(PRESET_LABELS).map(([value, label]) => ({ value, label })),
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
    { value: 'shadow-mask', label: 'maskShadowMask' },
    { value: 'lcd-grid', label: 'maskLcdGrid' }
  ],
  t: [
    { value: 'custom', label: 'crtCustom' },
    { value: 'consumer-shadow', label: 'crtConsumerShadow' },
    { value: 'consumer-grille', label: 'crtConsumerGrille' },
    { value: 'consumer-slot', label: 'crtConsumerSlot' },
    { value: 'pvm', label: 'crtPvm' },
    { value: 'bvm', label: 'crtBvm' },
    { value: 'pc-monitor', label: 'crtPcMonitor' },
    { value: 'arcade', label: 'crtArcade' },
    { value: 'lcd', label: 'crtLcd' }
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
