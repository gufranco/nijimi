import { sampleAt } from '../signal/sampleAt';
import type { RgbFrame } from '../signal/types';
import type { RgbaImage } from './types';

const RGB = 3;
const RGBA = 4;
const MAX_BYTE = 255;

export const toRgbFrame = (image: RgbaImage, scale: number): RgbFrame => {
  const width = image.width / scale;
  const height = image.height / scale;
  return {
    width,
    height,
    data: Float32Array.from({ length: width * height * RGB }, (_, index) => {
      const pixel = Math.floor(index / RGB);
      const source =
        (Math.floor(pixel / width) * scale * image.width + (pixel % width) * scale) * RGBA;
      const alpha = sampleAt(image.data, source + RGB) / MAX_BYTE;
      return (sampleAt(image.data, source + (index % RGB)) / MAX_BYTE) * alpha;
    })
  };
};
