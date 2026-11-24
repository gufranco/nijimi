import { describe, expect, it } from 'vitest';

import { createMemoryStore } from '../clip/createMemoryStore';
import type { LoadedClip } from '../input/types';
import { exportClip } from './exportClip';

const CLIP: LoadedClip = {
  image: {
    frame: { width: 1, height: 1, data: new Float32Array(3) },
    scale: 1,
    detectedScale: 1,
    stats: { colors: 1, levels: 1 },
    presence: null
  },
  frames: await createMemoryStore().seal(4),
  times: [0],
  duration: 0.2
};

describe('exportClip', () => {
  it.each([
    ['video/webm', 'nijimi-crt.webm'],
    ['video/mp4', 'nijimi-crt.mp4']
  ])('records one loop of the clip as %s and downloads it as %s', async (mimeType, name) => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.getContext('2d')?.fillRect(0, 0, 4, 4);
    const waited: number[] = [];
    const downloads: string[] = [];

    // Act
    await exportClip({
      clip: CLIP,
      fieldRate: 25,
      mimeType,
      canvas,
      wait: (ms) => {
        waited.splice(waited.length, 0, ms);
        return new Promise((resolve) => setTimeout(resolve, ms));
      },
      download: (blob, file) => downloads.splice(downloads.length, 0, `${file}:${blob.type}`),
      scheduler: {
        request: (tick) => requestAnimationFrame(tick),
        cancel: (handle) => {
          cancelAnimationFrame(handle);
        }
      },
      onStart: () => {
        waited.splice(waited.length, 0, 0);
        return Promise.resolve();
      }
    });

    // Assert
    expect(waited).toEqual([0, 200]);
    expect(downloads).toEqual([`${name}:${mimeType}`]);
  });
});
