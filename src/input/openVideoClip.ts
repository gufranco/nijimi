import type { Logger } from '../logging/createLogger';
import { grabFrame } from './grabFrame';
import type { ClipSource, VisitFrame } from './types';
import { waitForEvent } from './waitForEvent';

const EVENT_TIMEOUT_MS = 10_000;
const DECODER_CLASS = 'clip-decoder';
const DECODE_PLAYBACK_RATE = 0.5;

const release = (video: HTMLVideoElement, url: string): void => {
  video.removeAttribute('src');
  video.load();
  video.remove();
  URL.revokeObjectURL(url);
};

const playFrames =
  (video: HTMLVideoElement) =>
  (visit: VisitFrame): Promise<number> =>
    new Promise((resolve, reject) => {
      let last = 0;
      const ended = (): void => {
        resolve(Math.max(video.currentTime, last));
      };
      const step: VideoFrameRequestCallback = (_, metadata) => {
        video.pause();
        last = metadata.mediaTime;
        visit(grabFrame(video, video.videoWidth, video.videoHeight), metadata.mediaTime)
          .then(async (more) => {
            if (!more) {
              video.removeEventListener('ended', ended);
              resolve(last);
              return;
            }
            video.requestVideoFrameCallback(step);
            await video.play();
          })
          .catch(reject);
      };
      video.addEventListener('ended', ended, { once: true });
      visit(grabFrame(video, video.videoWidth, video.videoHeight), video.currentTime)
        .then(async (more) => {
          if (!more) {
            video.removeEventListener('ended', ended);
            resolve(video.currentTime);
            return;
          }
          video.requestVideoFrameCallback(step);
          await video.play();
        })
        .catch(reject);
    });

export const openVideoClip = async (input: {
  readonly blob: Blob;
  readonly doc: Document;
  readonly logger: Logger;
}): Promise<ClipSource> => {
  const url = URL.createObjectURL(input.blob);
  const video = input.doc.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.defaultPlaybackRate = DECODE_PLAYBACK_RATE;
  video.playbackRate = DECODE_PLAYBACK_RATE;
  video.classList.add(DECODER_CLASS);
  input.doc.body.append(video);
  const loaded = waitForEvent({ target: video, name: 'loadeddata', timeoutMs: EVENT_TIMEOUT_MS });
  video.src = url;
  await loaded.catch((error: unknown) => {
    input.logger.error(
      { err: error, bytes: input.blob.size },
      'video failed to load, releasing it'
    );
    release(video, url);
    throw error;
  });
  return {
    each: playFrames(video),
    close: () => {
      release(video, url);
    }
  };
};
