import type { DisplaySettings } from '../settings/types';
import type { ScanMode } from '../signal/scanMode';
import type { SignalImage } from '../signal/types';
import type { DisplayKind } from './displayKind';

export interface DisplayInput {
  readonly image: SignalImage;
  readonly settings: DisplaySettings;
  readonly gamma: number;
  readonly scan: ScanMode;
}

export interface DisplayGeometry {
  readonly width: number;
  readonly height: number;
  readonly crop: number;
}

export interface Display {
  readonly kind: DisplayKind;
  readonly canvas: HTMLCanvasElement;
  readonly draw: (input: DisplayInput) => DisplayGeometry;
}
