import { describe, expect, it } from 'vitest';

import { Connection } from './connection';
import { ConsolePreset } from './consolePreset';
import { FrameView } from './frameView';
import { PalDecoding } from './palDecoding';
import { quadratureFrame } from './quadratureFrame';
import { resolveTiming } from './resolveTiming';
import { samplingPlan } from './samplingPlan';
import { ScanMode } from './scanMode';
import { Separation } from './separation';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';
import type { FrameInput, RgbFrame } from './types';

const SETTINGS = {
  connection: Connection.Composite,
  standard: VideoStandard.PalBg,
  preset: ConsolePreset.GenesisH40,
  custom: { dotClockHz: 6e6, cyclesPerLine: 227.5 },
  separation: Separation.Notch,
  palDecoding: PalDecoding.Simple,
  scan: ScanMode.Progressive,
  frameView: FrameView.Average,
  frameIndex: 0,
  hueDegrees: 20,
  saturation: 1,
  gamma: 2.4,
  rf: { noise: 0, ghost: 0, beat: 0 },
  seed: 1
};

const flatFrame = (rgb: readonly number[], width: number, height: number): RgbFrame => ({
  width,
  height,
  data: Float32Array.from(Array.from({ length: width * height }, () => rgb).flat())
});

const inputFor = (overrides: Partial<typeof SETTINGS>): FrameInput => {
  const settings = { ...SETTINGS, ...overrides };
  const timing = resolveTiming(settings);
  const spec = STANDARDS[settings.standard];
  const plan = samplingPlan({
    dotClockHz: timing.dotClockHz,
    subcarrierHz: spec.subcarrierHz,
    pixels: 32
  });
  return { frame: flatFrame([0.7, 0.3, 0.2], 32, 6), frameIndex: 0, settings, plan, timing, spec };
};

const centreRgb = (row: Float32Array | null | undefined): readonly number[] => {
  const middle = Math.floor((row?.length ?? 0) / 6) * 3;
  return [
    row?.[middle] ?? Number.NaN,
    row?.[middle + 1] ?? Number.NaN,
    row?.[middle + 2] ?? Number.NaN
  ];
};

describe('quadratureFrame', () => {
  it('shows Hanover bars with a simple PAL decoder and a hue error', () => {
    // Arrange
    const input = inputFor({});

    // Act
    const frame = quadratureFrame(input);

    // Assert
    const [even, odd] = [centreRgb(frame.rows[2]), centreRgb(frame.rows[3])];
    expect(Math.abs((even[0] ?? 0) - (odd[0] ?? 0))).toBeGreaterThan(0.02);
  });

  it('cancels the hue error with the PAL delay line', () => {
    // Arrange
    const input = inputFor({ palDecoding: PalDecoding.DelayLine });

    // Act
    const frame = quadratureFrame(input);

    // Assert
    const [even, odd] = [centreRgb(frame.rows[2]), centreRgb(frame.rows[3])];
    even.forEach((value, channel) => {
      expect(value).toBeCloseTo(odd[channel] ?? Number.NaN, 2);
    });
  });

  it('decodes S-Video with no separation filter', () => {
    // Arrange
    const input = inputFor({ connection: Connection.SVideo, hueDegrees: 0 });

    // Act
    const frame = quadratureFrame(input);

    // Assert
    const rgb = centreRgb(frame.rows[3]);
    expect(rgb[0]).toBeCloseTo(0.7, 2);
    expect(rgb[1]).toBeCloseTo(0.3, 2);
    expect(rgb[2]).toBeCloseTo(0.2, 2);
  });

  it('runs RF through the channel and the softer RF luma band', () => {
    // Arrange
    const input = inputFor({
      connection: Connection.Rf,
      hueDegrees: 0,
      rf: { noise: 1, ghost: 0, beat: 0 }
    });

    // Act
    const frame = quadratureFrame(input);

    // Assert
    expect(frame.rows).toHaveLength(6);
    expect(Math.abs((centreRgb(frame.rows[3])[0] ?? 0) - 0.7)).toBeLessThan(0.2);
  });

  it('leaves the other field dark in an interlaced frame', () => {
    // Arrange
    const input = inputFor({ scan: ScanMode.Interlaced });

    // Act
    const frame = quadratureFrame(input);

    // Assert
    expect(frame.rows.map((row) => row === null)).toEqual([false, true, false, true, false, true]);
  });
});
