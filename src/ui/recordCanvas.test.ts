import { describe, expect, it } from 'vitest';

import { recordCanvas } from './recordCanvas';

const firstFrameRed = async (blob: Blob): Promise<number> => {
  const video = document.createElement('video');
  video.muted = true;
  video.src = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    video.addEventListener('loadeddata', resolve, { once: true });
  });
  const seeked = new Promise((resolve) => {
    video.addEventListener('seeked', resolve, { once: true });
  });
  video.currentTime = 0;
  await seeked;
  const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
  const context = canvas.getContext('2d');
  context?.drawImage(video, 0, 0);
  const red = context?.getImageData(0, 0, 1, 1).data[0] ?? -1;
  URL.revokeObjectURL(video.src);
  return red;
};

describe('recordCanvas', () => {
  it('records from the moment it starts, so the frame drawn on start opens the video', async () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    const context = canvas.getContext('2d');
    const started: string[] = [];

    // Act
    const blob = await recordCanvas({
      canvas,
      mimeType: 'video/webm',
      seconds: 0.3,
      scheduler: {
        request: (tick) => requestAnimationFrame(tick),
        cancel: (handle) => {
          cancelAnimationFrame(handle);
        }
      },
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      onStart: () => {
        started.splice(started.length, 0, 'started');
        if (context !== null) {
          context.fillStyle = '#ff0000';
          context.fillRect(0, 0, 16, 8);
        }
        return Promise.resolve();
      }
    });

    // Assert
    expect(blob.type).toBe('video/webm');
    expect(started).toEqual(['started']);
    expect(await firstFrameRed(blob)).toBeGreaterThan(200);
  });
});
