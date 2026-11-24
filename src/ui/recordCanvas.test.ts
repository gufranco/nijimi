import { describe, expect, it } from 'vitest';

import { hasAudio } from '../input/hasAudio';
import { recordCanvas } from './recordCanvas';

const firstFrameRed = async (blob: Blob): Promise<number> => {
  const video = document.createElement('video');
  video.muted = true;
  video.src = URL.createObjectURL(blob);
  document.body.append(video);
  const red = new Promise<number>((resolve) => {
    video.requestVideoFrameCallback(() => {
      const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0);
      resolve(context?.getImageData(0, 0, 1, 1).data[0] ?? -1);
    });
  });
  await video.play();
  const value = await red;
  video.pause();
  video.remove();
  URL.revokeObjectURL(video.src);
  return value;
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
      fps: 30,
      seconds: 0.3,
      scheduler: {
        now: () => performance.now(),
        request: (tick) => requestAnimationFrame(tick),
        cancel: (handle) => {
          cancelAnimationFrame(handle);
        }
      },
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      audio: null,
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

  it('records the audio track it is given beside the canvas', async () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 8;
    canvas.getContext('2d')?.fillRect(0, 0, 16, 8);
    const sound = new AudioContext();
    const tone = sound.createOscillator();
    const output = sound.createMediaStreamDestination();
    tone.connect(output);
    tone.start();
    await sound.resume();

    // Act
    const blob = await recordCanvas({
      canvas,
      mimeType: 'video/webm',
      fps: 30,
      seconds: 0.4,
      scheduler: {
        now: () => performance.now(),
        request: (tick) => requestAnimationFrame(tick),
        cancel: (handle) => {
          cancelAnimationFrame(handle);
        }
      },
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      onStart: () => Promise.resolve(),
      audio: output.stream
    });

    // Assert
    tone.stop();
    await sound.close();
    const video = document.createElement('video');
    video.muted = true;
    video.src = URL.createObjectURL(blob);
    await video.play();
    await new Promise((resolve) => {
      video.addEventListener('ended', resolve, { once: true });
    });
    expect(hasAudio(video)).toBe(true);
  });
});
