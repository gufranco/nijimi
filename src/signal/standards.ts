import type { StandardSpec } from './types';
import { VideoStandard } from './videoStandard';

const NTSC_SUBCARRIER_HZ = 315e6 / 88;
const PAL_BG_SUBCARRIER_HZ = 4_433_618.75;
const PAL_M_SUBCARRIER_HZ = 3_575_611.49;
const SQUARE_PIXEL_525_HZ = 135e6 / 11;
const SQUARE_PIXEL_625_HZ = 14.75e6;
const LUMA_525_BANDWIDTH_HZ = 4.2e6;
const SOUND_525_HZ = 4.5e6;

export const STANDARDS: Readonly<Record<VideoStandard, StandardSpec>> = {
  [VideoStandard.Ntsc]: {
    subcarrierHz: NTSC_SUBCARRIER_HZ,
    lumaBandwidthHz: LUMA_525_BANDWIDTH_HZ,
    chromaBandwidthHz: 1.48e6,
    narrowChromaBandwidthHz: 0.465e6,
    iqAxes: true,
    lineAlternation: false,
    squarePixelHz: SQUARE_PIXEL_525_HZ,
    soundCarrierHz: SOUND_525_HZ
  },
  [VideoStandard.PalBg]: {
    subcarrierHz: PAL_BG_SUBCARRIER_HZ,
    lumaBandwidthHz: 5.0e6,
    chromaBandwidthHz: 1.56e6,
    narrowChromaBandwidthHz: 1.56e6,
    iqAxes: false,
    lineAlternation: true,
    squarePixelHz: SQUARE_PIXEL_625_HZ,
    soundCarrierHz: 5.5e6
  },
  [VideoStandard.PalM]: {
    subcarrierHz: PAL_M_SUBCARRIER_HZ,
    lumaBandwidthHz: LUMA_525_BANDWIDTH_HZ,
    chromaBandwidthHz: 1.57e6,
    narrowChromaBandwidthHz: 1.57e6,
    iqAxes: false,
    lineAlternation: true,
    squarePixelHz: SQUARE_PIXEL_525_HZ,
    soundCarrierHz: SOUND_525_HZ
  }
};
