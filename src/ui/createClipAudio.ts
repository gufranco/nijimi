import type { ClipAudio } from './clipClock';

interface Capturable {
  readonly captureStream?: () => MediaStream;
  readonly mozCaptureStream?: () => MediaStream;
}

const captureOf = (element: HTMLAudioElement & Capturable): (() => MediaStream) | null => {
  const method = [element.captureStream, element.mozCaptureStream].find(
    (candidate) => candidate !== undefined
  );
  return method === undefined ? null : () => method.call(element);
};

const silence = (): MediaStream => new MediaStream();

export const createClipAudio = (input: {
  readonly blob: Blob;
  readonly createElement: () => HTMLAudioElement & Capturable;
}): ClipAudio => {
  const url = URL.createObjectURL(input.blob);
  const element = input.createElement();
  element.loop = true;
  element.preload = 'auto';
  element.src = url;
  let captured: MediaStream | null = null;
  return {
    time: () => element.currentTime,
    playing: () => !element.paused,
    play: () => element.play(),
    pause: () => {
      element.pause();
    },
    seek: (seconds) => {
      element.currentTime = seconds;
    },
    stream: () => {
      captured ??= (captureOf(element) ?? silence)();
      return captured;
    },
    close: () => {
      element.pause();
      element.removeAttribute('src');
      element.load();
      URL.revokeObjectURL(url);
      return Promise.resolve();
    }
  };
};
