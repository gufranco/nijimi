import type { Locale } from '../i18n/locale';
import type { SignalSettings } from '../signal/types';
import type { CrtModel } from './crtModel';
import type { MaskKind } from './maskKind';

export interface DisplaySettings {
  readonly crt: CrtModel;
  readonly scanlines: number;
  readonly mask: MaskKind;
  readonly maskStrength: number;
  readonly maskPitch: number;
  readonly bloom: number;
  readonly curvature: number;
  readonly overscan: boolean;
}

export interface AppSettings {
  readonly signal: SignalSettings;
  readonly display: DisplaySettings;
  readonly scale: number;
  readonly locale: Locale | null;
}

export interface ParsedSettings {
  readonly settings: AppSettings;
  readonly invalid: readonly string[];
}
