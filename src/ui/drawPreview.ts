import { required } from '../display/required';
import { sampleAt } from '../signal/sampleAt';
import type { RgbFrame } from '../signal/types';

const RGB = 3;
const RGBA = 4;
const MAX_BYTE = 255;

export const drawPreview = (canvas: HTMLCanvasElement, frame: RgbFrame): void => {
  canvas.setAttribute('width', String(frame.width));
  canvas.setAttribute('height', String(frame.height));
  const pixels = Uint8ClampedArray.from(
    { length: frame.width * frame.height * RGBA },
    (_, index) => {
      const channel = index % RGBA;
      return channel === RGB
        ? MAX_BYTE
        : sampleAt(frame.data, Math.floor(index / RGBA) * RGB + channel) * MAX_BYTE;
    }
  );
  required(canvas.getContext('2d'), 'preview canvas context').putImageData(
    new ImageData(pixels, frame.width, frame.height),
    0,
    0
  );
};
