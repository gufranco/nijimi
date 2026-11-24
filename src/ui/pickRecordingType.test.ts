import { describe, expect, it } from 'vitest';

import { pickRecordingType } from './pickRecordingType';

const supporting = (
  supported: readonly string[]
): { readonly isTypeSupported: (type: string) => boolean } => ({
  isTypeSupported: (type) => supported.includes(type)
});

describe('pickRecordingType', () => {
  it.each<[readonly string[], string | null]>([
    [
      ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'],
      'video/mp4;codecs=avc1'
    ],
    [['video/mp4', 'video/webm;codecs=vp9', 'video/webm'], 'video/mp4'],
    [['video/webm;codecs=vp9', 'video/webm'], 'video/webm;codecs=vp9'],
    [['video/webm'], 'video/webm'],
    [[], null]
  ])('prefers H.264 MP4, which macOS plays, for a silent clip, from %j', (supported, expected) => {
    // Arrange
    const recorder = supporting(supported);

    // Act
    const picked = pickRecordingType(recorder, false);

    // Assert
    expect(picked).toBe(expected);
  });

  it.each<[readonly string[], string | null]>([
    [['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4'], 'video/mp4;codecs=avc1,mp4a.40.2'],
    [['video/mp4;codecs=avc1', 'video/mp4'], 'video/mp4'],
    [['video/mp4;codecs=avc1', 'video/webm;codecs=vp9,opus'], 'video/webm;codecs=vp9,opus'],
    [['video/webm'], 'video/webm'],
    [['video/mp4;codecs=avc1'], null]
  ])('names an audio codec for a clip with sound, from %j', (supported, expected) => {
    // Arrange
    const recorder = supporting(supported);

    // Act
    const picked = pickRecordingType(recorder, true);

    // Assert
    expect(picked).toBe(expected);
  });

  it('picks nothing when the browser has no recorder', () => {
    // Arrange
    const recorder = undefined;

    // Act
    const picked = pickRecordingType(recorder, false);

    // Assert
    expect(picked).toBeNull();
  });
});
