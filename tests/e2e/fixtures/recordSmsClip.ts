import { chromium } from '@playwright/test';

const SCALE = 3;

export const recordSmsClip = async (): Promise<Buffer> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(async (scale: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256 * scale;
      canvas.height = 192 * scale;
      const context = canvas.getContext('2d');
      const levels = [0, 85, 170, 255];
      const palette = Array.from({ length: 16 }, (_, index) => [
        levels[index % 4] ?? 0,
        levels[(index >> 1) % 4] ?? 0,
        levels[(index >> 2) % 4] ?? 0
      ]);
      const paint = (frame: number): void => {
        for (let y = 0; y < 192; y += 1) {
          for (let x = 0; x < 256; x += 1) {
            const [r, g, b] = palette[((x >> 3) + (y >> 3) + frame) % 16] ?? [0, 0, 0];
            if (context !== null) {
              context.fillStyle = `rgb(${String(r)},${String(g)},${String(b)})`;
              context.fillRect(x * scale, y * scale, scale, scale);
            }
          }
        }
      };
      const type = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
        ? 'video/mp4;codecs=avc1'
        : 'video/mp4';
      const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: type });
      const chunks: Blob[] = [];
      recorder.addEventListener('dataavailable', (event) => {
        chunks.splice(chunks.length, 0, event.data);
      });
      const stopped = new Promise((resolve) => {
        recorder.addEventListener('stop', resolve);
      });
      paint(0);
      recorder.start();
      for (let frame = 1; frame <= 4; frame += 1) {
        paint(frame);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      recorder.stop();
      await stopped;
      return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
    }, SCALE);
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
};
