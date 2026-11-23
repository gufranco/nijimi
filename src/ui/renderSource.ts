import { required } from '../display/required';
import type { DisplayGeometry } from '../display/types';
import { sampleAt } from '../signal/sampleAt';
import type { RgbFrame } from '../signal/types';

const RGB = 3;
const RGBA = 4;
const MAX_BYTE = 255;

const frameImage = (frame: RgbFrame): ImageData =>
  new ImageData(
    Uint8ClampedArray.from({ length: frame.width * frame.height * RGBA }, (_, index) => {
      const channel = index % RGBA;
      return channel === RGB
        ? MAX_BYTE
        : Math.round(sampleAt(frame.data, Math.floor(index / RGBA) * RGB + channel) * MAX_BYTE);
    }),
    frame.width,
    frame.height
  );

export const renderSource = (input: {
  readonly canvas: HTMLCanvasElement;
  readonly frame: RgbFrame;
  readonly geometry: DisplayGeometry;
}): void => {
  const source = new OffscreenCanvas(input.frame.width, input.frame.height);
  required(source.getContext('2d'), 'offscreen 2D canvas context').putImageData(
    frameImage(input.frame),
    0,
    0
  );
  input.canvas.setAttribute('width', String(input.geometry.width));
  input.canvas.setAttribute('height', String(input.geometry.height));
  const context = required(input.canvas.getContext('2d'), 'source canvas context');
  context.imageSmoothingEnabled = false;
  const cropX = input.frame.width * input.geometry.crop;
  const cropY = input.frame.height * input.geometry.crop;
  context.drawImage(
    source,
    cropX,
    cropY,
    input.frame.width - 2 * cropX,
    input.frame.height - 2 * cropY,
    0,
    0,
    input.geometry.width,
    input.geometry.height
  );
};
