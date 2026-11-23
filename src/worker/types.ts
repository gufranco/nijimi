import type { RgbFrame, SignalImage, SignalSettings } from '../signal/types';

export interface SignalRequest {
  readonly id: number;
  readonly frames: readonly [RgbFrame, ...RgbFrame[]];
  readonly settings: SignalSettings;
}

export type SignalResponse =
  | { readonly id: number; readonly ok: true; readonly image: SignalImage }
  | { readonly id: number; readonly ok: false; readonly message: string };

export interface MessagePort {
  readonly postMessage: (message: unknown, transfer: Transferable[]) => void;
  readonly addEventListener: (type: 'message', listener: (event: MessageEvent) => void) => void;
}
