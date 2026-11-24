import {
  BlobSource,
  EncodedPacket,
  EncodedPacketSink,
  Input,
  MP4,
  VideoSampleSink,
  WEBM,
  registerDecoder
} from 'mediabunny';
import type { InputVideoTrack, VideoSample } from 'mediabunny';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { recordWebm } from '../../tests/fixtures/recordWebm';
import { required } from '../display/required';
import { OpaqueVpxDecoder } from './OpaqueVpxDecoder';

const UNDEFINED_LEVEL = 'vp09.00.00.08';

const recordedTrack = async (): Promise<InputVideoTrack> => {
  const blob = await recordWebm({
    width: 16,
    height: 8,
    colors: ['#ff0000', '#00ff00'],
    frameMs: 120,
    mimeType: 'video/mp4'
  });
  const media = new Input({ formats: [MP4], source: new BlobSource(blob) });
  return required(await media.getPrimaryVideoTrack(), 'video track');
};

const firstPixel = (sample: VideoSample): string => {
  const context = required(
    new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true }),
    '2D context'
  );
  sample.draw(context, 0, 0, 1, 1, 0, 0, 1, 1);
  const [red = 0, green = 0] = context.getImageData(0, 0, 1, 1).data;
  return red > green ? 'red' : 'green';
};

const standalone = (
  config: VideoDecoderConfig,
  sink: { readonly samples: VideoSample[]; readonly errors: unknown[] }
): OpaqueVpxDecoder => {
  const decoder = new OpaqueVpxDecoder();
  Reflect.defineProperty(decoder, 'config', { value: config });
  Reflect.defineProperty(decoder, 'onSample', {
    value: (sample: VideoSample) => sink.samples.splice(sink.samples.length, 0, sample)
  });
  Reflect.defineProperty(decoder, 'onError', {
    value: (error: unknown) => sink.errors.splice(sink.errors.length, 0, error)
  });
  return decoder;
};

describe('OpaqueVpxDecoder', () => {
  beforeAll(() => {
    registerDecoder(OpaqueVpxDecoder);
  });

  it.each([
    ['vp8', true],
    ['vp9', true],
    ['avc', false],
    ['av1', false]
  ] as const)('takes %s: %s', (codec, expected) => {
    // Arrange
    const supports = (name: typeof codec): boolean => OpaqueVpxDecoder.supports(name);

    // Act
    const taken = supports(codec);

    // Assert
    expect(taken).toBe(expected);
  });

  it('decodes a Chromium VP9 MP4 recording whose level is undefined', async () => {
    // Arrange
    const track = await recordedTrack();
    const sizes: string[] = [];

    // Act
    for await (const sample of new VideoSampleSink(track).samples()) {
      sizes.splice(
        sizes.length,
        0,
        `${String(sample.displayWidth)}x${String(sample.displayHeight)}`
      );
      sample.close();
    }

    // Assert
    expect((await track.getDecoderConfig())?.codec).toBe(`${UNDEFINED_LEVEL}.00.01.13.01.01`);
    expect(sizes.length).toBeGreaterThan(1);
    expect(new Set(sizes)).toEqual(new Set(['16x8']));
  });

  it.each(['video/webm;codecs=vp8', 'video/webm;codecs=vp9'])(
    'decodes a %s recording whose frames carry alpha without starting a worker',
    async (mimeType) => {
      // Arrange
      vi.stubGlobal('Worker', function refuseWorker(): never {
        throw new Error('workers are refused');
      });
      const blob = await recordWebm({
        width: 16,
        height: 8,
        colors: ['#ff0000', '#00ff00'],
        frameMs: 120,
        mimeType
      });
      const media = new Input({ formats: [WEBM], source: new BlobSource(blob) });
      const track = required(await media.getPrimaryVideoTrack(), 'video track');
      const first = required(await new EncodedPacketSink(track).getFirstPacket(), 'first packet');
      const colors: string[] = [];

      // Act
      for await (const sample of new VideoSampleSink(track).samples()) {
        colors.splice(colors.length, 0, firstPixel(sample));
        sample.close();
      }

      // Assert
      vi.unstubAllGlobals();
      expect(first.sideData.alpha).toBeInstanceOf(Uint8Array);
      expect(colors.filter((color, index) => color !== colors[index - 1])).toEqual([
        'red',
        'green'
      ]);
    }
  );

  it('configures a level when the config names no picture size', async () => {
    // Arrange
    const sink: { readonly samples: VideoSample[]; readonly errors: unknown[] } = {
      samples: [],
      errors: []
    };
    const decoder = standalone({ codec: UNDEFINED_LEVEL }, sink);

    // Act
    decoder.init();
    const flushed = decoder.flush();

    // Assert
    await expect(flushed).resolves.toBeUndefined();
    expect(sink.errors).toEqual([]);
    decoder.close();
  });

  it('reports a packet it cannot decode', async () => {
    // Arrange
    const sink: { readonly samples: VideoSample[]; readonly errors: unknown[] } = {
      samples: [],
      errors: []
    };
    const track = await recordedTrack();
    const first = required(await new EncodedPacketSink(track).getFirstPacket(), 'first packet');
    const decoder = standalone(required(await track.getDecoderConfig(), 'decoder config'), sink);
    decoder.init();

    // Act
    decoder.decode(new EncodedPacket(first.data.slice(0, 16), 'key', 0, 0.04));
    const flushed = decoder.flush();

    // Assert
    await expect(flushed).rejects.toBeInstanceOf(DOMException);
    expect([sink.samples, sink.errors.length]).toEqual([[], 1]);
  });
});
