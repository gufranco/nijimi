import { fieldSources } from '../clip/fieldSources';
import { readNative } from '../clip/readNative';
import type { FrameReader, FrameStore } from '../clip/types';
import type { Display } from '../display/types';
import { toRgbFrame } from '../input/toRgbFrame';
import type { LoadedClip, RgbaImage } from '../input/types';
import { toError } from '../logging/toError';
import type { AppSettings } from '../settings/types';
import type { SignalImage } from '../signal/types';
import { unpackSignalImage } from '../signal/unpackSignalImage';
import type { SignalClient } from '../worker/createSignalClient';
import type { ClipAudio, Clock } from './clipClock';
import { createClipPlayer } from './createClipPlayer';
import type { ClipPlayer, PlayerState, Scheduler } from './createClipPlayer';
import { createWallClock } from './createWallClock';
import { renderClip } from './renderClip';
import type { RenderedClip } from './renderClip';
import { renderSource } from './renderSource';

interface ClipStageOptions {
  readonly clients: () => readonly [SignalClient, ...SignalClient[]];
  readonly openStore: () => Promise<FrameStore>;
  readonly fieldRate: (settings: AppSettings) => number;
  readonly display: Display;
  readonly sourceCanvas: HTMLCanvasElement;
  readonly scheduler: Scheduler;
  readonly createAudio: (blob: Blob) => ClipAudio;
  readonly onState: (state: PlayerState) => void;
  readonly onBusy: (busy: boolean) => void;
  readonly onProgress: (done: number, total: number) => void;
  readonly onError: (error: Error) => void;
}

export interface ClipInput {
  readonly clip: LoadedClip;
  readonly blob: Blob;
  readonly clipVersion: number;
  readonly settings: AppSettings;
}

export interface ClipStage {
  readonly show: (input: ClipInput) => Promise<void>;
  readonly stop: () => void;
  readonly play: () => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly toggle: () => Promise<void>;
  readonly rewind: () => Promise<void>;
  readonly step: (fields: number) => Promise<void>;
  readonly jump: (seconds: number) => Promise<void>;
  readonly restart: () => Promise<void>;
  readonly audioStream: () => MediaStream | null;
}

interface Playing {
  readonly key: string;
  readonly player: ClipPlayer;
  readonly fields: FrameReader;
  readonly audio: ClipAudio | null;
  readonly follow: (input: ClipInput) => void;
}

interface FieldFrame {
  readonly image: SignalImage;
  readonly native: RgbaImage;
}

const signalKey = (input: ClipInput, rate: number): string =>
  `${String(input.clipVersion)}:${String(rate)}:${JSON.stringify(input.settings.signal)}`;

const paint = (options: ClipStageOptions, settings: AppSettings, frame: FieldFrame): void => {
  const geometry = options.display.draw({
    image: frame.image,
    settings: settings.display,
    gamma: settings.signal.gamma,
    scan: settings.signal.scan
  });
  renderSource({ canvas: options.sourceCanvas, frame: toRgbFrame(frame.native, 1), geometry });
};

const playerFor = (
  options: ClipStageOptions,
  input: ClipInput,
  sources: Uint32Array,
  rendered: RenderedClip,
  clock: Clock
): { readonly player: ClipPlayer; readonly follow: (next: ClipInput) => void } => {
  let shown = input;
  const { width, height } = input.clip.image.frame;
  const player = createClipPlayer<FieldFrame>({
    count: sources.length,
    fieldRate: options.fieldRate(input.settings),
    autoplay: !input.clip.audio,
    clock,
    scheduler: options.scheduler,
    onState: options.onState,
    fetch: async (field) => ({
      image: unpackSignalImage({
        ...rendered.layout,
        data: new Uint8ClampedArray(await rendered.fields.read(field))
      }),
      native: await readNative({ frames: input.clip.frames, sources, field, width, height })
    }),
    draw: (frame) => {
      paint(options, shown.settings, frame);
    },
    onError: (error) => {
      options.onError(toError(error));
    }
  });
  return {
    player,
    follow: (next) => {
      shown = next;
    }
  };
};

const discardRendered = (outcome: RenderedClip | Error): Promise<void> =>
  outcome instanceof Error ? Promise.resolve() : outcome.fields.discard();

const renderInto =
  (options: ClipStageOptions, input: ClipInput, sources: Uint32Array, signal: AbortSignal) =>
  async (store: FrameStore): Promise<RenderedClip> => {
    const { width, height } = input.clip.image.frame;
    return renderClip({
      clients: options.clients(),
      frames: input.clip.frames,
      width,
      height,
      sources,
      settings: input.settings.signal,
      store,
      signal,
      onProgress: options.onProgress
    }).catch(async (error: unknown) => {
      await (await store.seal(1)).discard();
      throw error;
    });
  };

export const createClipStage = (options: ClipStageOptions): ClipStage => {
  let controller = new AbortController();
  let playing: Playing | null = null;
  const report = (error: unknown): void => {
    options.onError(toError(error));
  };
  const halt = (): void => {
    controller.abort(new Error('the clip render was superseded'));
    playing?.player.stop();
    playing?.fields.discard().catch(report);
    playing?.audio?.close().catch(report);
    playing = null;
  };
  const render = async (input: ClipInput, key: string): Promise<void> => {
    halt();
    const own = new AbortController();
    controller = own;
    options.onBusy(true);
    const sources = fieldSources({ ...input.clip, fieldRate: options.fieldRate(input.settings) });
    const outcome = await options
      .openStore()
      .then(renderInto(options, input, sources, own.signal))
      .catch((error: unknown) => toError(error));
    if (own.signal.aborted) {
      await discardRendered(outcome);
      return;
    }
    options.onBusy(false);
    if (outcome instanceof Error) {
      options.onError(outcome);
      return;
    }
    const audio = input.clip.audio ? options.createAudio(input.blob) : null;
    const clock = audio ?? createWallClock(options.scheduler.now);
    const { player, follow } = playerFor(options, input, sources, outcome, clock);
    playing = { key, player, fields: outcome.fields, audio, follow };
    await player.start();
  };
  return {
    show: async (input) => {
      const key = signalKey(input, options.fieldRate(input.settings));
      if (playing?.key === key) {
        playing.follow(input);
        await playing.player.redraw();
        return;
      }
      await render(input, key);
    },
    stop: halt,
    play: async () => {
      await playing?.player.play();
    },
    pause: async () => {
      await playing?.player.pause();
    },
    toggle: async () => {
      await playing?.player.toggle();
    },
    rewind: async () => {
      await playing?.player.rewind();
    },
    step: async (fields) => {
      await playing?.player.step(fields);
    },
    jump: async (seconds) => {
      await playing?.player.jump(seconds);
    },
    restart: async () => {
      await playing?.player.rewind();
      await playing?.player.play();
    },
    audioStream: () => playing?.audio?.stream() ?? null
  };
};
