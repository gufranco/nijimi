import { required } from '../display/required';
import { sampleAt } from '../signal/sampleAt';
import { grabFrame } from './grabFrame';
import type { ClipSource } from './types';

const MICROSECONDS = 1_000_000;

interface FrameTimes {
  readonly starts: readonly number[];
  readonly total: number;
}

const frameTimes = async (decoder: ImageDecoder, count: number): Promise<FrameTimes> => {
  const durations = await Promise.all(
    Array.from({ length: count }, async (_, frameIndex) => {
      const { image } = await decoder.decode({ frameIndex });
      const duration = Number(image.duration) / MICROSECONDS;
      image.close();
      return duration;
    })
  );
  const sum = (values: readonly number[]): number =>
    values.reduce((total, duration) => total + duration, 0);
  return {
    starts: durations.map((_, index) => sum(durations.slice(0, index))),
    total: sum(durations)
  };
};

export const openImageClip = async (input: {
  readonly blob: Blob;
  readonly Decoder: typeof ImageDecoder;
}): Promise<ClipSource> => {
  const decoder = new input.Decoder({
    data: await input.blob.arrayBuffer(),
    type: input.blob.type
  });
  await decoder.completed;
  await decoder.tracks.ready;
  const count = required(decoder.tracks.selectedTrack, 'image track').frameCount;
  const { starts, total } = await frameTimes(decoder, count);
  return {
    lossy: false,
    hasAudio: () => false,
    each: async (visit) => {
      for (let frameIndex = 0; frameIndex < count; frameIndex += 1) {
        const { image } = await decoder.decode({ frameIndex });
        const frame = grabFrame(image, image.displayWidth, image.displayHeight);
        image.close();
        const start = sampleAt(starts, frameIndex);
        if (!(await visit(frame, start))) {
          return start;
        }
      }
      return total;
    },
    close: () => {
      decoder.close();
    }
  };
};
