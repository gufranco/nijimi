import { SIGNAL_PACKING } from './signalPacking';
import type { PackedSignalImage, SignalImage } from './types';

export const packSignalImage = (image: SignalImage): PackedSignalImage => ({
  width: image.width,
  height: image.height,
  sampleAspect: image.sampleAspect,
  frameCount: image.frameCount,
  data: Uint8ClampedArray.from(image.data, (value) =>
    Math.round(((value - SIGNAL_PACKING.min) / SIGNAL_PACKING.range) * SIGNAL_PACKING.maxByte)
  )
});
