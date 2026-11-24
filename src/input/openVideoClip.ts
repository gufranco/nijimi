import { BlobSource, Input, MATROSKA, MP4, QTFF, VideoSampleSink, WEBM } from 'mediabunny';
import type { InputVideoTrack } from 'mediabunny';

import { required } from '../display/required';
import type { Logger } from '../logging/createLogger';
import { grabFrame } from './grabFrame';
import type { ClipSource, VisitFrame } from './types';

const VIDEO_FORMATS = [MP4, QTFF, MATROSKA, WEBM];

interface OpenedVideo {
  readonly track: InputVideoTrack;
  readonly first: number;
  readonly end: number;
  readonly audio: boolean;
}

const readTracks = async (media: Input): Promise<OpenedVideo> => {
  const track = required(
    await media.getPrimaryVideoTrack({ filter: (candidate) => candidate.canDecode() }),
    'decodable video track'
  );
  return {
    track,
    first: await track.getFirstTimestamp(),
    end: await track.computeDuration(),
    audio: (await media.getPrimaryAudioTrack()) !== null
  };
};

const decodeFrames =
  (video: OpenedVideo) =>
  async (visit: VisitFrame): Promise<number> => {
    for await (const sample of new VideoSampleSink(video.track).samples()) {
      const frame = grabFrame(
        sample.toCanvasImageSource(),
        sample.displayWidth,
        sample.displayHeight
      );
      const seconds = sample.timestamp - video.first;
      sample.close();
      if (!(await visit(frame, seconds))) {
        return seconds;
      }
    }
    return video.end - video.first;
  };

export const openVideoClip = async (input: {
  readonly blob: Blob;
  readonly logger: Logger;
}): Promise<ClipSource> => {
  const media = new Input({ formats: VIDEO_FORMATS, source: new BlobSource(input.blob) });
  const video = await readTracks(media).catch((error: unknown) => {
    input.logger.error(
      { err: error, type: input.blob.type, bytes: input.blob.size },
      'video could not be opened, releasing it'
    );
    media.dispose();
    throw error;
  });
  return {
    lossy: true,
    hasAudio: () => video.audio,
    each: decodeFrames(video),
    close: () => {
      media.dispose();
    }
  };
};
