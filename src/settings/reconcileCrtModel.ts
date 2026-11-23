import { CrtModel } from './crtModel';
import { CRT_PRESETS } from './crtPresets';
import type { DisplaySettings } from './types';

export const reconcileCrtModel = (display: DisplaySettings): DisplaySettings => {
  if (display.crt === CrtModel.Custom) {
    return display;
  }
  const look = CRT_PRESETS[display.crt];
  const matches = (Object.keys(look) as (keyof typeof look)[]).every(
    (key) => display[key] === look[key]
  );
  return matches ? display : { ...display, crt: CrtModel.Custom };
};
