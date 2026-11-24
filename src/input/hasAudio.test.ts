import { describe, expect, it } from 'vitest';

import { hasAudio } from './hasAudio';

const videoWith = (properties: Readonly<Record<string, unknown>>): HTMLVideoElement => {
  const video = document.createElement('video');
  Object.entries(properties).forEach(([name, value]) => {
    Object.defineProperty(video, name, { value, configurable: true });
  });
  return video;
};

describe('hasAudio', () => {
  it.each([
    ['decoded audio bytes in Chromium', { webkitAudioDecodedByteCount: 6713 }, true],
    ['the audio flag in Firefox', { webkitAudioDecodedByteCount: 0, mozHasAudio: true }, true],
    [
      'an audio track in WebKit',
      { webkitAudioDecodedByteCount: 0, audioTracks: { length: 1 } },
      true
    ],
    [
      'none of them',
      { webkitAudioDecodedByteCount: 0, mozHasAudio: false, audioTracks: { length: 0 } },
      false
    ]
  ])('reads %s', (_, properties, expected) => {
    // Arrange
    const video = videoWith(properties);

    // Act
    const found = hasAudio(video);

    // Assert
    expect(found).toBe(expected);
  });
});
