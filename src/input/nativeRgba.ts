import { sampleAt } from '../signal/sampleAt';
import type { RgbaImage } from './types';

const RGBA = 4;

export const nativeRgba = (image: RgbaImage, scale: number): RgbaImage => {
  const width = image.width / scale;
  const height = image.height / scale;
  return {
    width,
    height,
    data: Uint8ClampedArray.from({ length: width * height * RGBA }, (_, index) => {
      const pixel = Math.floor(index / RGBA);
      const source =
        (Math.floor(pixel / width) * scale * image.width + (pixel % width) * scale) * RGBA;
      return sampleAt(image.data, source + (index % RGBA));
    })
  };
};
