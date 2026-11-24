interface FrameSource {
  readonly requestFrame: () => void;
}

const isFrameSource = <T extends object>(target: T): target is T & FrameSource =>
  'requestFrame' in target;

export const recordWebm = async (input: {
  readonly width: number;
  readonly height: number;
  readonly colors: readonly string[];
  readonly frameMs: number;
  readonly audio?: boolean;
}): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = input.colors[0] ?? '#000000';
    context.fillRect(0, 0, input.width, input.height);
  }
  const stream = canvas.captureStream(0);
  const sound = new AudioContext();
  const tone = sound.createOscillator();
  const output = sound.createMediaStreamDestination();
  tone.connect(output);
  tone.start();
  await sound.resume();
  const tracks = [
    ...stream.getVideoTracks(),
    ...(input.audio === true ? output.stream.getAudioTracks() : [])
  ];
  const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    chunks.splice(chunks.length, 0, event.data);
  });
  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', resolve, { once: true });
  });
  const paint = (color: string): void => {
    if (context !== null) {
      context.fillStyle = color;
      context.fillRect(0, 0, input.width, input.height);
    }
    [stream, ...stream.getVideoTracks()].filter(isFrameSource).forEach((source) => {
      source.requestFrame();
    });
  };
  recorder.start();
  await input.colors.reduce(async (previous, color) => {
    await previous;
    paint(color);
    await new Promise((resolve) => setTimeout(resolve, input.frameMs));
  }, Promise.resolve());
  recorder.stop();
  await stopped;
  tone.stop();
  await sound.close();
  return new Blob(chunks, { type: 'video/webm' });
};
