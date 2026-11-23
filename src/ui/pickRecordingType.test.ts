import { describe, expect, it } from 'vitest';

import { pickRecordingType } from './pickRecordingType';

describe('pickRecordingType', () => {
  it.each<[readonly string[], string | null]>([
    [['video/webm;codecs=vp9', 'video/webm', 'video/mp4'], 'video/webm;codecs=vp9'],
    [['video/webm', 'video/mp4'], 'video/webm'],
    [['video/mp4'], 'video/mp4'],
    [[], null]
  ])('picks the first supported of VP9 WebM, WebM and MP4 from %j', (supported, expected) => {
    // Arrange
    const recorder = { isTypeSupported: (type: string): boolean => supported.includes(type) };

    // Act
    const picked = pickRecordingType(recorder);

    // Assert
    expect(picked).toBe(expected);
  });

  it('picks nothing when the browser has no recorder', () => {
    // Arrange
    const recorder = undefined;

    // Act
    const picked = pickRecordingType(recorder);

    // Assert
    expect(picked).toBeNull();
  });
});
