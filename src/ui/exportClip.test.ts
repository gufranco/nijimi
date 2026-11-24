import {
  ALL_FORMATS,
  AudioSampleSink,
  BlobSource,
  Input,
  VideoSampleSink,
  canEncodeVideo
} from 'mediabunny';
import type { VideoSample } from 'mediabunny';
import { describe, expect, it } from 'vitest';

import { recordWebm } from '../../tests/fixtures/recordWebm';
import { createMemoryStore } from '../clip/createMemoryStore';
import { required } from '../display/required';
import type { LoadedClip } from '../input/types';
import { exportClip } from './exportClip';
import { ExportContainer } from './pickExportEncoding';
import type { ExportEncoding } from './pickExportEncoding';

const COLORS = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#ff0000'];
const NAMES = ['red', 'green', 'blue', 'white', 'red'];
const H264_OPUS: ExportEncoding = { container: ExportContainer.Mp4, video: 'avc', audio: 'opus' };

const clipOf = async (audio: boolean): Promise<LoadedClip> => ({
  image: {
    frame: { width: 1, height: 1, data: new Float32Array(3) },
    scale: 1,
    detectedScale: 1,
    stats: { colors: 1, levels: 1 },
    presence: null
  },
  frames: await createMemoryStore().seal(4),
  times: [0],
  duration: 0.2,
  audio
});

const colorOf = (sample: VideoSample): string => {
  const context = required(
    new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true }),
    '2D context'
  );
  sample.draw(context, 4, 4, 1, 1, 0, 0, 1, 1);
  const lit = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((value) => value > 128);
  return lit.every(Boolean) ? 'white' : (['red', 'green', 'blue'][lit.indexOf(true)] ?? 'black');
};

interface Exported {
  readonly blob: Blob;
  readonly name: string;
  readonly progress: readonly string[];
}

const run = async (input: {
  readonly encoding: ExportEncoding;
  readonly audio: boolean;
  readonly source?: Blob;
  readonly seek?: (field: number) => Promise<void>;
  readonly canEncode?: typeof canEncodeVideo;
  readonly width?: number;
  readonly height?: number;
}): Promise<Exported> => {
  const canvas = document.createElement('canvas');
  canvas.width = input.width ?? 319;
  canvas.height = input.height ?? 239;
  const context = required(canvas.getContext('2d'), '2D context');
  const downloads: (readonly [Blob, string])[] = [];
  const progress: string[] = [];
  await exportClip({
    clip: await clipOf(input.audio),
    source: input.source ?? new Blob([]),
    fieldRate: 25,
    encoding: input.encoding,
    canvas,
    seek:
      input.seek ??
      ((field) => {
        context.fillStyle = COLORS[field] ?? '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        return Promise.resolve();
      }),
    onProgress: (done, total) =>
      progress.splice(progress.length, 0, `${String(done)}/${String(total)}`),
    download: (blob, name) => downloads.splice(downloads.length, 0, [blob, name]),
    canEncodeVideo: input.canEncode ?? canEncodeVideo
  });
  const [blob, name] = required(downloads[0] ?? null, 'download');
  return { blob, name, progress };
};

const boxes = async (blob: Blob): Promise<readonly string[]> => {
  const view = new DataView(await blob.arrayBuffer());
  const found: string[] = [];
  for (let offset = 0; offset + 8 <= view.byteLength && found.length < 8;) {
    const size = view.getUint32(offset);
    found.splice(
      found.length,
      0,
      String.fromCharCode(...new Uint8Array(view.buffer, offset + 4, 4))
    );
    offset += Math.max(size, 8);
  }
  return found;
};

describe('exportClip', () => {
  it('encodes every field in order as an H.264 MP4 with its index first, scaled to 480 lines and padded to even sizes', async () => {
    // Arrange
    const encoding = { ...H264_OPUS, audio: null };

    // Act
    const { blob, name, progress } = await run({ encoding, audio: false });

    // Assert
    const media = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
    const track = required(await media.getPrimaryVideoTrack(), 'video track');
    const seen: string[] = [];
    for await (const sample of new VideoSampleSink(track).samples()) {
      seen.splice(
        seen.length,
        0,
        `${colorOf(sample)} ${String(sample.displayWidth)}x${String(sample.displayHeight)}`
      );
      sample.close();
    }
    expect([name, blob.type, await track.getCodec()]).toEqual([
      'nijimi-crt.mp4',
      'video/mp4',
      'avc'
    ]);
    expect(await track.getCodecParameterString()).toMatch(/^avc1\.(64|4d|42)[0-9a-f]{2}1f$/);
    expect(seen).toEqual(NAMES.map((color) => `${color} 958x718`));
    expect((await boxes(blob)).slice(0, 3)).toEqual(['ftyp', 'moov', 'mdat']);
    expect(await media.getPrimaryAudioTrack()).toBeNull();
    expect(progress).toEqual(['1/5', '2/5', '3/5', '4/5', '5/5']);
  });

  it('scales a tiny screen by a whole factor until its short side reaches 480 pixels', async () => {
    // Arrange
    const encoding = { ...H264_OPUS, audio: null };

    // Act
    const { blob } = await run({ encoding, audio: false, width: 16, height: 8 });

    // Assert
    const media = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
    const track = required(await media.getPrimaryVideoTrack(), 'video track');
    expect([await track.getDisplayWidth(), await track.getDisplayHeight()]).toEqual([960, 480]);
  });

  it('keeps the clip sound, encoded with the chosen codec', async () => {
    // Arrange
    const source = await recordWebm({
      width: 8,
      height: 8,
      colors: COLORS,
      frameMs: 60,
      audio: true
    });

    // Act
    const { blob } = await run({ encoding: H264_OPUS, audio: true, source });

    // Assert
    const media = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
    const audio = required(await media.getPrimaryAudioTrack(), 'audio track');
    let samples = 0;
    for await (const sample of new AudioSampleSink(audio).samples()) {
      samples += 1;
      sample.close();
    }
    expect([await audio.getCodec(), samples > 0]).toEqual(['opus', true]);
  });

  it('writes a VP9 WebM where H.264 cannot be encoded, and leaves out sound no codec can encode', async () => {
    // Arrange
    const source = await recordWebm({
      width: 8,
      height: 8,
      colors: COLORS,
      frameMs: 60,
      audio: true
    });
    const encoding: ExportEncoding = { container: ExportContainer.Webm, video: 'vp9', audio: null };

    // Act
    const { blob, name } = await run({ encoding, audio: true, source });

    // Assert
    const media = new Input({ formats: ALL_FORMATS, source: new BlobSource(blob) });
    expect([name, blob.type]).toEqual(['nijimi-crt.webm', 'video/webm']);
    expect(await (await media.getPrimaryVideoTrack())?.getCodec()).toBe('vp9');
    expect(await media.getPrimaryAudioTrack()).toBeNull();
  });

  it('refuses a size no H.264 profile can encode', async () => {
    // Arrange
    const canEncode = (): Promise<boolean> => Promise.resolve(false);

    // Act
    const exporting = run({ encoding: H264_OPUS, audio: false, canEncode });

    // Assert
    await expect(exporting).rejects.toThrow('H.264 profile for this size is unavailable');
  });

  it('stops and rejects when a field cannot be shown', async () => {
    // Arrange
    const seek = (): Promise<void> => Promise.reject(new Error('field read failed'));

    // Act
    const exporting = run({ encoding: H264_OPUS, audio: false, seek });

    // Assert
    await expect(exporting).rejects.toThrow('field read failed');
  });
});
