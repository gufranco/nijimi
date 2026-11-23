import type { Display } from '../display/types';
import { toError } from '../logging/toError';
import type { AppSettings } from '../settings/types';
import type { RgbFrame, SignalImage } from '../signal/types';
import type { SignalClient } from '../worker/createSignalClient';
import { renderSource } from './renderSource';

type Frames = readonly [RgbFrame, ...RgbFrame[]];

interface PreviewInput {
  readonly frames: Frames | null;
  readonly framesVersion: number;
  readonly settings: AppSettings;
}

interface PreviewOptions {
  readonly client: SignalClient;
  readonly display: Display;
  readonly sourceCanvas: HTMLCanvasElement;
  readonly onBusy: (busy: boolean) => void;
  readonly onRendered: (image: SignalImage) => void;
  readonly onError: (error: Error) => void;
}

interface Cached {
  readonly key: string;
  readonly image: SignalImage;
}

export interface Preview {
  readonly update: (input: PreviewInput) => Promise<void>;
  readonly redraw: () => void;
}

const signalKey = (input: PreviewInput): string =>
  `${String(input.framesVersion)}:${JSON.stringify(input.settings.signal)}`;

const draw = (
  options: PreviewOptions,
  image: SignalImage,
  frames: Frames,
  settings: AppSettings
): void => {
  const geometry = options.display.draw({
    image,
    settings: settings.display,
    gamma: settings.signal.gamma,
    scan: settings.signal.scan
  });
  renderSource({ canvas: options.sourceCanvas, frame: frames[0], geometry });
};

const createTickets = (): {
  readonly next: () => number;
  readonly isLatest: (ticket: number) => boolean;
} => {
  let latest = 0;
  return {
    next: (): number => {
      latest += 1;
      return latest;
    },
    isLatest: (ticket: number): boolean => ticket === latest
  };
};

export const createPreview = (options: PreviewOptions): Preview => {
  const tickets = createTickets();
  let cached: Cached | null = null;
  let shown: { readonly frames: Frames; readonly settings: AppSettings } | null = null;
  const show = (image: SignalImage, frames: Frames, settings: AppSettings): void => {
    shown = { frames, settings };
    draw(options, image, frames, settings);
  };
  const fresh = async (input: PreviewInput, frames: Frames, key: string): Promise<void> => {
    const ticket = tickets.next();
    options.onBusy(true);
    const outcome = await options.client.render(frames, input.settings.signal).then(
      (image) => ({ image, error: null }),
      (error: unknown) => ({ image: null, error: toError(error) })
    );
    if (!tickets.isLatest(ticket)) {
      return;
    }
    options.onBusy(false);
    if (outcome.image === null) {
      options.onError(outcome.error);
      return;
    }
    cached = { key, image: outcome.image };
    show(outcome.image, frames, input.settings);
    options.onRendered(outcome.image);
  };
  return {
    update: async (input) => {
      const key = signalKey(input);
      if (input.frames !== null && cached?.key === key) {
        show(cached.image, input.frames, input.settings);
        return;
      }
      await (input.frames === null ? Promise.resolve() : fresh(input, input.frames, key));
    },
    redraw: () => {
      if (cached !== null && shown !== null) {
        draw(options, cached.image, shown.frames, shown.settings);
      }
    }
  };
};
