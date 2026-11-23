import { averageFrames } from './averageFrames';
import { cyclic } from './cyclic';
import { frameCycle } from './frameCycle';
import { FrameView } from './frameView';
import { resolveTiming } from './resolveTiming';
import { samplingPlan } from './samplingPlan';
import { ScanMode } from './scanMode';
import { simulateFrame } from './simulateFrame';
import { STANDARDS } from './standards';
import type { RgbFrame, SignalImage, SignalSettings } from './types';

const PROGRESSIVE_LINE_FACTOR = 2;

export const simulateSignal = (
  frames: readonly [RgbFrame, ...RgbFrame[]],
  settings: SignalSettings
): SignalImage => {
  const first = frames[0];
  const timing = resolveTiming(settings);
  const spec = STANDARDS[settings.standard];
  const plan = samplingPlan({
    dotClockHz: timing.dotClockHz,
    subcarrierHz: spec.subcarrierHz,
    pixels: first.width
  });
  const single = settings.frameView === FrameView.Single;
  const frameCount = single
    ? 1
    : frameCycle({ timing, scan: settings.scan, sourceFrames: frames.length });
  const start = single ? settings.frameIndex : 0;
  const rendered = Array.from({ length: frameCount }, (_, offset) => {
    const frameIndex = start + offset;
    return simulateFrame({
      frame: cyclic(frames, frameIndex),
      frameIndex,
      settings,
      plan,
      timing,
      spec
    });
  });
  const lineFactor = settings.scan === ScanMode.Interlaced ? 1 : PROGRESSIVE_LINE_FACTOR;
  return {
    width: plan.width,
    height: first.height,
    data: averageFrames({
      frames: rendered,
      width: plan.width,
      height: first.height,
      gamma: settings.gamma
    }),
    sampleAspect: spec.squarePixelHz / plan.sampleRateHz / lineFactor,
    frameCount
  };
};
