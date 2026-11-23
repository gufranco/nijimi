import { required } from '../display/required';
import type { RgbaImage } from './types';

export const grabFrame = (source: CanvasImageSource, width: number, height: number): RgbaImage => {
  const context = required(
    new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true }),
    'offscreen 2D canvas context'
  );
  context.drawImage(source, 0, 0);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
};
