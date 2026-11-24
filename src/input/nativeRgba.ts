import { sampleAt } from '../signal/sampleAt';
import type { RgbaImage } from './types';

const RGBA = 4;

export const nativeRgba = (image: RgbaImage, scale: number, phase: number): RgbaImage => {
  const width = image.width / scale;
  const height = image.height / scale;
  return {
    width,
    height,
    data: Uint8ClampedArray.from({ length: width * height * RGBA }, (_, index) => {
      const pixel = Math.floor(index / RGBA);
      const row = Math.floor(pixel / width) * scale + phase;
      const column = (pixel % width) * scale + phase;
      return sampleAt(image.data, (row * image.width + column) * RGBA + (index % RGBA));
    })
  };
};
