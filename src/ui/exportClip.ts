import { fieldCount } from '../clip/fieldCount';
import type { LoadedClip } from '../input/types';
import type { Scheduler } from './createClipPlayer';
import { recordCanvas } from './recordCanvas';

const VIDEO_NAME = 'nijimi-crt';

const extensionOf = (mimeType: string): string =>
  mimeType.startsWith('video/mp4') ? 'mp4' : 'webm';

export const exportClip = async (input: {
  readonly clip: LoadedClip;
  readonly fieldRate: number;
  readonly mimeType: string;
  readonly canvas: HTMLCanvasElement;
  readonly wait: (ms: number) => Promise<void>;
  readonly download: (blob: Blob, name: string) => void;
  readonly onStart: () => Promise<void>;
  readonly scheduler: Scheduler;
  readonly audio: MediaStream | null;
}): Promise<void> => {
  const blob = await recordCanvas({
    canvas: input.canvas,
    mimeType: input.mimeType,
    fps: input.fieldRate,
    seconds: fieldCount(input.clip.duration, input.fieldRate) / input.fieldRate,
    wait: input.wait,
    onStart: input.onStart,
    scheduler: input.scheduler,
    audio: input.audio
  });
  input.download(blob, `${VIDEO_NAME}.${extensionOf(input.mimeType)}`);
};
