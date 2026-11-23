import type { RgbaImage } from './types';

const MAX_SCALE = 8;
const CHANNELS = 4;

const pixelMatchesBlock = (image: RgbaImage, pixel: number, scale: number): boolean => {
  const x = pixel % image.width;
  const y = Math.floor(pixel / image.width);
  const origin = ((y - (y % scale)) * image.width + (x - (x % scale))) * CHANNELS;
  const offset = pixel * CHANNELS;
  return (
    image.data[offset] === image.data[origin] &&
    image.data[offset + 1] === image.data[origin + 1] &&
    image.data[offset + 2] === image.data[origin + 2] &&
    image.data[offset + 3] === image.data[origin + 3]
  );
};

const isScaledBy = (image: RgbaImage, scale: number): boolean => {
  if (image.width % scale !== 0 || image.height % scale !== 0) {
    return false;
  }
  const pixels = image.width * image.height;
  for (let pixel = 0; pixel < pixels; pixel += 1) {
    if (!pixelMatchesBlock(image, pixel, scale)) {
      return false;
    }
  }
  return true;
};

export const detectScale = (image: RgbaImage): number =>
  Array.from({ length: MAX_SCALE - 1 }, (_, index) => MAX_SCALE - index).find((scale) =>
    isScaledBy(image, scale)
  ) ?? 1;
