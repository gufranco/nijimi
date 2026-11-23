import { create2dDisplay } from './create2dDisplay';
import { createGlDisplay } from './createGlDisplay';
import type { Display } from './types';

export const createDisplay = (
  canvas: HTMLCanvasElement,
  tryWebGl: (target: HTMLCanvasElement) => Display | null = createGlDisplay
): Display => tryWebGl(canvas) ?? create2dDisplay(canvas);
