import { waitForEvent } from '../input/waitForEvent';

const STOP_TIMEOUT_MS = 10_000;
const MS_PER_SECOND = 1000;

export const recordCanvas = async (input: {
  readonly canvas: HTMLCanvasElement;
  readonly mimeType: string;
  readonly fps: number;
  readonly seconds: number;
  readonly wait: (ms: number) => Promise<void>;
}): Promise<Blob> => {
  const recorder = new MediaRecorder(input.canvas.captureStream(input.fps), {
    mimeType: input.mimeType
  });
  let chunks: readonly Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    chunks = [...chunks, event.data];
  });
  const stopped = waitForEvent({ target: recorder, name: 'stop', timeoutMs: STOP_TIMEOUT_MS });
  recorder.start();
  await input.wait(input.seconds * MS_PER_SECOND);
  recorder.stop();
  await stopped;
  return new Blob([...chunks], { type: input.mimeType });
};
