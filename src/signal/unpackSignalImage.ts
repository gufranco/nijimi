import { SIGNAL_PACKING } from './signalPacking';
import type { PackedSignalImage, SignalImage } from './types';

export const unpackSignalImage = (packed: PackedSignalImage): SignalImage => ({
  width: packed.width,
  height: packed.height,
  sampleAspect: packed.sampleAspect,
  frameCount: packed.frameCount,
  data: Float32Array.from(
    packed.data,
    (byte) => (byte / SIGNAL_PACKING.maxByte) * SIGNAL_PACKING.range + SIGNAL_PACKING.min
  )
});
