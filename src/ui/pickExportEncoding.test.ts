import { describe, expect, it } from 'vitest';

import { ExportContainer, pickExportEncoding } from './pickExportEncoding';
import type { ExportEncoding } from './pickExportEncoding';

const able =
  (codecs: readonly string[]) =>
  (codec: string): Promise<boolean> =>
    Promise.resolve(codecs.includes(codec));

describe('pickExportEncoding', () => {
  it.each<[readonly string[], ExportEncoding | null]>([
    [['avc', 'vp9', 'aac', 'opus'], { container: ExportContainer.Mp4, video: 'avc', audio: 'aac' }],
    [['avc', 'opus'], { container: ExportContainer.Mp4, video: 'avc', audio: 'opus' }],
    [['avc'], { container: ExportContainer.Mp4, video: 'avc', audio: null }],
    [['vp9', 'aac', 'opus'], { container: ExportContainer.Webm, video: 'vp9', audio: 'opus' }],
    [['vp9', 'aac'], { container: ExportContainer.Webm, video: 'vp9', audio: null }],
    [['aac', 'opus'], null]
  ])(
    'prefers H.264 with AAC in MP4, which WhatsApp and QuickTime play, from %j',
    async (codecs, expected) => {
      // Arrange
      const capabilities = { canEncodeVideo: able(codecs), canEncodeAudio: able(codecs) };

      // Act
      const picked = await pickExportEncoding(capabilities);

      // Assert
      expect(picked).toEqual(expected);
    }
  );
});
