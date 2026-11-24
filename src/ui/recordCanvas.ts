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
  readonly seconds: number;
  readonly scheduler: Scheduler;
  readonly wait: (ms: number) => Promise<void>;
  readonly onStart: () => Promise<void>;
}): Promise<Blob> => {
  const stream = input.canvas.captureStream(0);
  const recorder = new MediaRecorder(stream, { mimeType: input.mimeType });
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
  recorder.start();
  await input.onStart();
  capture();
  await input.wait(input.seconds * MS_PER_SECOND);
  input.scheduler.cancel(handle);
  recorder.stop();
  await stopped;
  return new Blob([...chunks], { type: input.mimeType });
};
