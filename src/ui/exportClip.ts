import {
  AudioSampleSink,
  AudioSampleSource,
  BlobSource,
  BufferTarget,
  CanvasSource,
  Input,
  MATROSKA,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  Quality,
  WEBM,
  WebMOutputFormat
} from 'mediabunny';
import type { canEncodeVideo } from 'mediabunny';

import { fieldCount } from '../clip/fieldCount';
import { required } from '../display/required';
import type { LoadedClip } from '../input/types';
import { avcCodecStrings } from './avcCodecStrings';
import { ExportContainer } from './pickExportEncoding';
import type { ExportEncoding } from './pickExportEncoding';

const VIDEO_NAME = 'nijimi-crt';
const QUALITY = 'very-high';
const SOURCE_FORMATS = [MP4, QTFF, MATROSKA, WEBM];

interface ExportInput {
  readonly clip: LoadedClip;
  readonly source: Blob;
  readonly fieldRate: number;
  readonly encoding: ExportEncoding;
  readonly canvas: HTMLCanvasElement;
  readonly seek: (field: number) => Promise<void>;
  readonly onProgress: (done: number, total: number) => void;
  readonly download: (blob: Blob, name: string) => void;
  readonly canEncodeVideo: typeof canEncodeVideo;
}

const MIN_SHORT_SIDE = 480;

const even = (size: number): number => size + (size % 2);

const scaleFor = (canvas: HTMLCanvasElement): number =>
  Math.max(1, Math.ceil(MIN_SHORT_SIDE / Math.min(canvas.width, canvas.height)));

const encodeFields = async (
  input: ExportInput,
  video: CanvasSource,
  frame: OffscreenCanvas
): Promise<void> => {
  const context = required(frame.getContext('2d'), 'export frame context');
  context.imageSmoothingEnabled = false;
  const scale = scaleFor(input.canvas);
  const total = fieldCount(input.clip.duration, input.fieldRate);
  for (let field = 0; field < total; field += 1) {
    await input.seek(field);
    context.fillRect(0, 0, frame.width, frame.height);
    context.drawImage(input.canvas, 0, 0, input.canvas.width * scale, input.canvas.height * scale);
    await video.add(field / input.fieldRate, 1 / input.fieldRate);
    input.onProgress(field + 1, total);
  }
  video.close();
};

const encodeSound = async (input: ExportInput, audio: AudioSampleSource): Promise<void> => {
  const media = new Input({ formats: SOURCE_FORMATS, source: new BlobSource(input.source) });
  const track = required(await media.getPrimaryAudioTrack(), 'clip sound track');
  const end = fieldCount(input.clip.duration, input.fieldRate) / input.fieldRate;
  for await (const sample of new AudioSampleSink(track).samples(0, end)) {
    await audio.add(sample);
    sample.close();
  }
  audio.close();
  media.dispose();
};

const avcProfile = async (
  input: ExportInput,
  frame: OffscreenCanvas
): Promise<{ readonly fullCodecString?: string }> => {
  if (input.encoding.video !== 'avc') {
    return {};
  }
  const size = { width: frame.width, height: frame.height, frameRate: input.fieldRate };
  const strings = avcCodecStrings(size);
  const able = await Promise.all(
    strings.map((fullCodecString) =>
      input.canEncodeVideo('avc', { ...size, quality: new Quality(QUALITY), fullCodecString })
    )
  );
  return {
    fullCodecString: required(strings[able.indexOf(true)] ?? null, 'H.264 profile for this size')
  };
};

const createOutput = (
  container: ExportContainer
): Output<Mp4OutputFormat | WebMOutputFormat, BufferTarget> =>
  new Output({
    format:
      container === ExportContainer.Mp4
        ? new Mp4OutputFormat({ fastStart: 'in-memory' })
        : new WebMOutputFormat(),
    target: new BufferTarget()
  });

export const exportClip = async (input: ExportInput): Promise<void> => {
  const { encoding } = input;
  const scale = scaleFor(input.canvas);
  const frame = new OffscreenCanvas(
    even(input.canvas.width * scale),
    even(input.canvas.height * scale)
  );
  const output = createOutput(encoding.container);
  const video = new CanvasSource(frame, {
    codec: encoding.video,
    quality: new Quality(QUALITY),
    latencyMode: 'quality',
    ...(await avcProfile(input, frame))
  });
  output.addVideoTrack(video, { frameRate: input.fieldRate });
  const audio =
    input.clip.audio && encoding.audio !== null
      ? new AudioSampleSource({ codec: encoding.audio, quality: new Quality(QUALITY) })
      : null;
  if (audio !== null) {
    output.addAudioTrack(audio);
  }
  await output.start();
  await Promise.all([
    encodeFields(input, video, frame),
    audio === null ? Promise.resolve() : encodeSound(input, audio)
  ]).catch(async (error: unknown) => {
    await output.cancel();
    throw error;
  });
  await output.finalize();
  const bytes = required(output.target.buffer, 'encoded video');
  input.download(
    new Blob([bytes], { type: `video/${encoding.container}` }),
    `${VIDEO_NAME}.${encoding.container}`
  );
};
