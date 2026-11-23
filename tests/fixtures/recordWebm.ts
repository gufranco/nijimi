export const recordWebm = async (input: {
  readonly width: number;
  readonly height: number;
  readonly colors: readonly string[];
  readonly frameMs: number;
}): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext('2d');
  const recorder = new MediaRecorder(canvas.captureStream(), { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  recorder.addEventListener('dataavailable', (event) => {
    chunks.splice(chunks.length, 0, event.data);
  });
  const stopped = new Promise((resolve) => {
    recorder.addEventListener('stop', resolve);
  });
  const paint = (color: string): void => {
    if (context !== null) {
      context.fillStyle = color;
      context.fillRect(0, 0, input.width, input.height);
    }
  };
  paint(input.colors[0] ?? '#000000');
  recorder.start();
  await input.colors.reduce(async (previous, color) => {
    await previous;
    paint(color);
    await new Promise((resolve) => setTimeout(resolve, input.frameMs));
  }, Promise.resolve());
  recorder.stop();
  await stopped;
  return new Blob(chunks, { type: 'video/webm' });
};
