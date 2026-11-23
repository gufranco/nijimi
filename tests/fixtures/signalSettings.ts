import { Connection } from '../../src/signal/connection';
import { ConsolePreset } from '../../src/signal/consolePreset';
import { FrameView } from '../../src/signal/frameView';
import { PalDecoding } from '../../src/signal/palDecoding';
import { ScanMode } from '../../src/signal/scanMode';
import { Separation } from '../../src/signal/separation';
import type { SignalSettings } from '../../src/signal/types';
import { VideoStandard } from '../../src/signal/videoStandard';

const NTSC_SUBCARRIER_HZ = 315e6 / 88;

export const signalSettings = (overrides: Partial<SignalSettings> = {}): SignalSettings => ({
  connection: Connection.Composite,
  standard: VideoStandard.Ntsc,
  preset: ConsolePreset.GenesisH40,
  custom: { dotClockHz: 2 * NTSC_SUBCARRIER_HZ, cyclesPerLine: 227.5 },
  separation: Separation.Notch,
  palDecoding: PalDecoding.Simple,
  scan: ScanMode.Progressive,
  frameView: FrameView.Average,
  frameIndex: 0,
  hueDegrees: 0,
  saturation: 1,
  gamma: 2.4,
  rf: { noise: 0, ghost: 0, beat: 0 },
  seed: 1,
  ...overrides
});
