import { CustomVideoDecoder, VideoSample } from 'mediabunny';
import type { EncodedPacket, VideoCodec } from 'mediabunny';

import { vp9LevelFor } from './vp9Level';

const UNDEFINED_LEVEL = '00';
const LEVEL_FIELD = 2;

const VPX_CODECS: readonly VideoCodec[] = ['vp8', 'vp9'];

const withLevel = (config: VideoDecoderConfig): VideoDecoderConfig => {
  const fields = config.codec.split('.');
  if (fields[LEVEL_FIELD] !== UNDEFINED_LEVEL) {
    return config;
  }
  const level = vp9LevelFor((config.codedWidth ?? 0) * (config.codedHeight ?? 0));
  return { ...config, codec: fields.with(LEVEL_FIELD, level).join('.') };
};

export class OpaqueVpxDecoder extends CustomVideoDecoder {
  private readonly decoder = new VideoDecoder({
    output: (frame) => {
      this.onSample(new VideoSample(frame));
    },
    error: (error) => {
      this.onError(error);
    }
  });

  static override supports(codec: VideoCodec): boolean {
    return VPX_CODECS.includes(codec);
  }

  init(): void {
    this.decoder.configure(withLevel(this.config));
  }

  decode(packet: EncodedPacket): void {
    this.decoder.decode(packet.toEncodedVideoChunk());
  }

  flush(): Promise<void> {
    return this.decoder.flush();
  }

  close(): void {
    this.decoder.close();
  }
}
