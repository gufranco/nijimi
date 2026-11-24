import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { createMemoryStore } from '../clip/createMemoryStore';
import type { LoadedClip } from '../input/types';
import { describeClip } from './describeClip';

const CLIP: LoadedClip = {
  image: {
    frame: { width: 1, height: 1, data: new Float32Array(3) },
    scale: 1,
    detectedScale: 1,
    stats: { colors: 1, levels: 1 },
    presence: null
  },
  frames: await createMemoryStore().seal(4),
  times: [0, 0.02, 0.04],
  duration: 0.06,
  audio: false
};

describe('describeClip', () => {
  it.each([
    [Locale.En, ', 3 fields at 59.92 Hz'],
    [Locale.PtBr, ', 3 campos a 59,92 Hz'],
    [Locale.Ja, ', 3 フィールド、59.92 Hz']
  ])('names the field count and rate in %s', (locale, expected) => {
    // Arrange
    const clip = CLIP;

    // Act
    const text = describeClip(locale, clip, 59.922751);

    // Assert
    expect(text).toBe(expected);
  });

  it('says nothing about a still picture', () => {
    // Arrange
    const clip = null;

    // Act
    const text = describeClip(Locale.En, clip, 60);

    // Assert
    expect(text).toBe('');
  });
});
