import { describe, expect, it } from 'vitest';

import { recordWebm } from '../../tests/fixtures/recordWebm';
import { createClipAudio } from './createClipAudio';

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#ff0000', '#00ff00'];

describe('createClipAudio', () => {
  it('plays the clip sound as a clock, seeks, pauses and offers a stream to record', async () => {
    // Arrange
    const blob = await recordWebm({
      width: 8,
      height: 8,
      colors: COLORS,
      frameMs: 150,
      audio: true
    });
    const audio = createClipAudio({ blob, createElement: () => document.createElement('audio') });

    // Act
    await audio.play();
    await new Promise((resolve) => setTimeout(resolve, 200));
    const running = [audio.playing(), audio.time() > 0];
    audio.pause();
    audio.seek(0.5);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const tracks = audio.stream().getAudioTracks().length;
    const same = audio.stream() === audio.stream();

    // Assert
    expect(running).toEqual([true, true]);
    expect([audio.playing(), audio.time(), tracks, same]).toEqual([false, 0.5, 1, true]);
    await audio.close();
  });

  it('closes without having played', async () => {
    // Arrange
    const audio = createClipAudio({
      blob: new Blob([]),
      createElement: () => document.createElement('audio')
    });

    // Act
    const closing = audio.close();

    // Assert
    await expect(closing).resolves.toBeUndefined();
  });

  it('offers a silent stream where the browser cannot capture the element', async () => {
    // Arrange
    const createElement = (): HTMLAudioElement => {
      const element = document.createElement('audio');
      Object.defineProperty(element, 'captureStream', { value: undefined });
      return element;
    };
    const audio = createClipAudio({ blob: new Blob([]), createElement });

    // Act
    const stream = audio.stream();

    // Assert
    expect(stream.getAudioTracks()).toHaveLength(0);
    await audio.close();
  });
});
