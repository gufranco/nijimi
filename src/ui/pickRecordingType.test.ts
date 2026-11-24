import { describe, expect, it } from 'vitest';

import { pickRecordingType } from './pickRecordingType';

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
  ])(
    'prefers H.264 MP4, which macOS plays, then MP4, VP9 WebM and WebM, from %j',
    (supported, expected) => {
      // Arrange
      const recorder = { isTypeSupported: (type: string): boolean => supported.includes(type) };

      // Act
      const picked = pickRecordingType(recorder);

      // Assert
      expect(picked).toBe(expected);
    }
  );

  it('picks nothing when the browser has no recorder', () => {
    // Arrange
    const recorder = undefined;

    // Act
    const picked = pickRecordingType(recorder);

    // Assert
    expect(picked).toBeNull();
  });
});
