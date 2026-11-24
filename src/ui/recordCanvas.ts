import { waitForEvent } from '../input/waitForEvent';
import type { Scheduler } from './createClipPlayer';

const STOP_TIMEOUT_MS = 10_000;
const MS_PER_SECOND = 1000;

interface FrameSource {
  readonly requestFrame: () => void;
}

const isFrameSource = <T extends object>(target: T): target is T & FrameSource =>
  'requestFrame' in target;

export const recordCanvas = async (input: {
  readonly canvas: HTMLCanvasElement;
  readonly mimeType: string;
  readonly fps: number;
  readonly seconds: number;
  readonly scheduler: Scheduler;
  readonly wait: (ms: number) => Promise<void>;
  readonly onStart: () => Promise<void>;
  readonly audio: MediaStream | null;
}): Promise<Blob> => {
  await input.onStart();
  const stream = input.canvas.captureStream(input.fps);
  const tracks = [...stream.getVideoTracks(), ...(input.audio?.getAudioTracks() ?? [])];
  const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: input.mimeType });
  let chunks: readonly Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    chunks = [...chunks, event.data];
  });
  const stopped = waitForEvent({ target: recorder, name: 'stop', timeoutMs: STOP_TIMEOUT_MS });
  let handle = 0;
  const capture = (): void => {
    [stream, ...stream.getVideoTracks()].filter(isFrameSource).forEach((source) => {
      source.requestFrame();
    });
    handle = input.scheduler.request(capture);
  };
  const framed = new Promise<void>((resolve) => {
    input.scheduler.request(() => {
      resolve();
    });
  });
  capture();
  await framed;
  recorder.start();
  await input.wait(input.seconds * MS_PER_SECOND);
  input.scheduler.cancel(handle);
  recorder.stop();
  await stopped;
  return new Blob([...chunks], { type: input.mimeType });
};
