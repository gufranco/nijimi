import { Connection } from '../signal/connection';
import { ConsolePreset } from '../signal/consolePreset';
import { FrameView } from '../signal/frameView';
import { PalDecoding } from '../signal/palDecoding';
import { ScanMode } from '../signal/scanMode';
import { Separation } from '../signal/separation';
import { VideoStandard } from '../signal/videoStandard';
import { CrtModel } from './crtModel';
import { MaskKind } from './maskKind';
import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  signal: {
    connection: Connection.Composite,
    standard: VideoStandard.Ntsc,
    preset: ConsolePreset.GenesisH40,
    custom: { dotClockHz: 7_159_090, cyclesPerLine: 227.5 },
    separation: Separation.Notch,
    palDecoding: PalDecoding.DelayLine,
    scan: ScanMode.Progressive,
    frameView: FrameView.Average,
    frameIndex: 0,
    hueDegrees: 0,
    saturation: 1,
    gamma: 2.4,
    rf: { noise: 0, ghost: 0, beat: 0 },
    seed: 1
  },
  display: {
    crt: CrtModel.Custom,
    scanlines: 0.9,
    mask: MaskKind.ApertureGrille,
    maskStrength: 0.35,
    maskPitch: 1,
    bloom: 0.25,
    curvature: 0.15,
    overscan: false
  },
  scale: 0,
  locale: null
};
