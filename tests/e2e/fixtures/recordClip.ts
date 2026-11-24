import { chromium } from '@playwright/test';

export const recordClip = async (mimeType: string, audio = false): Promise<Buffer> => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(
      async ({ type, withAudio }: { type: string; withAudio: boolean }) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 16;
        document.body.append(canvas);
        const context = canvas.getContext('2d');
        const sound = new AudioContext();
        const tone = sound.createOscillator();
        const output = sound.createMediaStreamDestination();
        tone.connect(output);
        tone.start();
        await sound.resume();
        const tracks = [
          ...canvas.captureStream().getVideoTracks(),
          ...(withAudio ? output.stream.getAudioTracks() : [])
        ];
        const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: type });
        const chunks: Blob[] = [];
        recorder.addEventListener('dataavailable', (event) => {
          chunks.splice(chunks.length, 0, event.data);
        });
        const stopped = new Promise((resolve) => {
          recorder.addEventListener('stop', resolve);
        });
        recorder.start();
        for (const color of ['#ff0000', '#ff0000', '#0000ff', '#0000ff', '#00ff00']) {
          if (context !== null) {
            context.fillStyle = color;
            context.fillRect(0, 0, 32, 16);
          }
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        recorder.stop();
        await stopped;
        return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
      },
      { type: mimeType, withAudio: audio }
    );
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
};
