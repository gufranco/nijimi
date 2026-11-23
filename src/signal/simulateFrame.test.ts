import { describe, expect, it } from 'vitest';

import { Connection } from './connection';
import { ConsolePreset } from './consolePreset';
import { FrameView } from './frameView';
import { PalDecoding } from './palDecoding';
import { resolveTiming } from './resolveTiming';
import { samplingPlan } from './samplingPlan';
import { ScanMode } from './scanMode';
import { Separation } from './separation';
import { simulateFrame } from './simulateFrame';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';
import type { FrameInput } from './types';

const SETTINGS = {
  connection: Connection.Rgb,
  standard: VideoStandard.Ntsc,
  preset: ConsolePreset.Nes,
  custom: { dotClockHz: 6e6, cyclesPerLine: 227.5 },
  separation: Separation.Notch,
  palDecoding: PalDecoding.Simple,
  scan: ScanMode.Interlaced,
  frameView: FrameView.Average,
  frameIndex: 0,
  hueDegrees: 0,
  saturation: 1,
  gamma: 2.4,
  rf: { noise: 0, ghost: 0, beat: 0 },
  seed: 1
};

const inputFor = (connection: Connection): FrameInput => {
  const settings = { ...SETTINGS, connection };
  const timing = resolveTiming(settings);
  const spec = STANDARDS[settings.standard];
  const plan = samplingPlan({
    dotClockHz: timing.dotClockHz,
    subcarrierHz: spec.subcarrierHz,
    pixels: 16
  });
  const frame = { width: 16, height: 4, data: new Float32Array(16 * 4 * 3).fill(0.5) };
  return { frame, frameIndex: 1, settings, plan, timing, spec };
};

describe('simulateFrame', () => {
  it.each([
    Connection.Rgb,
    Connection.Component,
    Connection.SVideo,
    Connection.Composite,
    Connection.Rf
  ])('renders the lit field of a grey frame through %s', (connection) => {
    // Arrange
    const input = inputFor(connection);

    // Act
    const frame = simulateFrame(input);

    // Assert
    expect(frame.rows.map((row) => row === null)).toEqual([true, false, true, false]);
    expect(frame.rows[1]?.[30]).toBeCloseTo(0.5, 2);
  });
});
