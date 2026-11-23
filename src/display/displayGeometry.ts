import { ScanMode } from '../signal/scanMode';
import type { SignalImage } from '../signal/types';
import type { DisplayGeometry } from './types';

const PROGRESSIVE_ROWS_PER_LINE = 4;
const INTERLACED_ROWS_PER_LINE = 2;
const ACTION_SAFE_CROP = 0.05;
const MAX_SIDE = 4096;
const MIN_ROWS_PER_LINE = 1;

export const displayGeometry = (input: {
  readonly image: SignalImage;
  readonly scan: ScanMode;
  readonly overscan: boolean;
}): DisplayGeometry => {
  const aspect = (input.image.width * input.image.sampleAspect) / input.image.height;
  const wanted =
    input.scan === ScanMode.Interlaced ? INTERLACED_ROWS_PER_LINE : PROGRESSIVE_ROWS_PER_LINE;
  const fitting = Math.floor(MAX_SIDE / Math.max(input.image.height, input.image.height * aspect));
  const rowsPerLine = Math.max(MIN_ROWS_PER_LINE, Math.min(wanted, fitting));
  const height = input.image.height * rowsPerLine;
  return {
    width: Math.round(height * aspect),
    height,
    crop: input.overscan ? ACTION_SAFE_CROP : 0
  };
};
