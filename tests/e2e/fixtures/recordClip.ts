import { chromium } from '@playwright/test';

export const recordClip = async (mimeType: string): Promise<Buffer> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const bytes = await page.evaluate(async (type: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 16;
      document.body.append(canvas);
      const context = canvas.getContext('2d');
      const recorder = new MediaRecorder(canvas.captureStream(), { mimeType: type });
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
    }, mimeType);
    return Buffer.from(bytes);
  } finally {
    await browser.close();
  }
};
