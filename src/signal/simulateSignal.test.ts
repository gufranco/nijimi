import { describe, expect, it } from 'vitest';

import { Connection } from './connection';
import { ConsolePreset } from './consolePreset';
import { FrameView } from './frameView';
import { PalDecoding } from './palDecoding';
import { ScanMode } from './scanMode';
import { Separation } from './separation';
import { simulateSignal } from './simulateSignal';
import { VideoStandard } from './videoStandard';
import type { RgbFrame } from './types';

const SETTINGS = {
  connection: Connection.Rgb,
  standard: VideoStandard.Ntsc,
  preset: ConsolePreset.Nes,
  custom: { dotClockHz: 6e6, cyclesPerLine: 227.5 },
  separation: Separation.Notch,
  palDecoding: PalDecoding.Simple,
  scan: ScanMode.Progressive,
  frameView: FrameView.Average,
  frameIndex: 0,
  hueDegrees: 0,
  saturation: 1,
  gamma: 2.4,
  rf: { noise: 0, ghost: 0, beat: 0 },
  seed: 1
};

const grey = (value: number, width: number, height: number): RgbFrame => ({
  width,
  height,
  data: new Float32Array(width * height * 3).fill(value)
});

describe('simulateSignal', () => {
  it('gives a 256-wide NES picture an 8:7 pixel aspect ratio', () => {
    // Arrange
    const frames = [grey(0.5, 256, 4)] as const;

    // Act
    const image = simulateSignal(frames, SETTINGS);

    // Assert
    const pixelAspect = (image.sampleAspect * image.width) / 256;
    expect(pixelAspect).toBeCloseTo(8 / 7, 2);
    expect(image.height).toBe(4);
    expect(image.data).toHaveLength(image.width * 4 * 3);
  });

  it('gives a 320-wide Genesis H40 picture a 32:35 pixel aspect ratio', () => {
    // Arrange
    const frames = [grey(0.5, 320, 2)] as const;

    // Act
    const image = simulateSignal(frames, { ...SETTINGS, preset: ConsolePreset.GenesisH40 });

    // Assert
    expect((image.sampleAspect * image.width) / 320).toBeCloseTo(32 / 35, 2);
  });

  it('halves the row height in samples when interlaced', () => {
    // Arrange
    const frames = [grey(0.5, 256, 4)] as const;

    // Act
    const image = simulateSignal(frames, { ...SETTINGS, scan: ScanMode.Interlaced });

    // Assert
    expect((image.sampleAspect * image.width) / 256).toBeCloseTo(16 / 7, 2);
    expect(image.frameCount).toBe(2);
  });

  it('averages the NES 2-frame crawl and shows one frame on request', () => {
    // Arrange
    const frames = [grey(0.5, 16, 2)] as const;

    // Act
    const views = [FrameView.Average, FrameView.Single].map((frameView) =>
      simulateSignal(frames, {
        ...SETTINGS,
        connection: Connection.Composite,
        frameView,
        frameIndex: 1
      })
    );

    // Assert
    expect(views.map((image) => image.frameCount)).toEqual([2, 1]);
  });

  it('alternates flicker frames and blends them in linear light', () => {
    // Arrange
    const frames = [grey(0, 16, 2), grey(1, 16, 2)] as const;

    // Act
    const image = simulateSignal(frames, { ...SETTINGS, preset: ConsolePreset.GenesisH32 });

    // Assert
    expect(image.frameCount).toBe(2);
    expect(image.data[30]).toBeCloseTo(0.5 ** (1 / 2.4), 3);
  });
});
