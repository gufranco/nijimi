import type { LoadedClip, LoadedImage } from '../input/types';
import type { MessageKey } from '../i18n/types';
import type { AppSettings } from '../settings/types';
import type { RgbFrame } from '../signal/types';

export interface Notice {
  readonly key: MessageKey;
  readonly params: Readonly<Record<string, string>>;
  readonly tone: 'info' | 'error';
}

export interface ClipState {
  readonly loaded: LoadedClip;
  readonly blob: Blob;
}

export interface AppState {
  readonly settings: AppSettings;
  readonly mainBlob: Blob | null;
  readonly main: LoadedImage | null;
  readonly clip: ClipState | null;
  readonly flicker: RgbFrame | null;
  readonly framesVersion: number;
  readonly notice: Notice | null;
}
