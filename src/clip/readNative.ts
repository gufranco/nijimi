import type { RgbaImage } from '../input/types';
import { sampleAt } from '../signal/sampleAt';
import type { FrameReader } from './types';

export const readNative = async (input: {
  readonly frames: FrameReader;
  readonly sources: Uint32Array;
  readonly field: number;
  readonly width: number;
  readonly height: number;
}): Promise<RgbaImage> => {
  const bytes = await input.frames.read(sampleAt(input.sources, input.field));
  return {
    width: input.width,
    height: input.height,
    data: new Uint8ClampedArray(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  };
};
