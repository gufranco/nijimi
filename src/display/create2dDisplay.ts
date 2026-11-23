import { sampleAt } from '../signal/sampleAt';
import { displayGeometry } from './displayGeometry';
import { sizeCanvas } from './sizeCanvas';
import { DisplayKind } from './displayKind';
import { required } from './required';
import type { Display, DisplayGeometry, DisplayInput } from './types';

const RGB = 3;
const RGBA = 4;
const MAX_BYTE = 255;

const toImageData = (input: DisplayInput): ImageData => {
  const { width, height, data } = input.image;
  const bytes = Uint8ClampedArray.from({ length: width * height * RGBA }, (_, index) => {
    const channel = index % RGBA;
    const pixel = Math.floor(index / RGBA);
    return channel === RGB
      ? MAX_BYTE
      : Math.round(sampleAt(data, pixel * RGB + channel) * MAX_BYTE);
  });
  return new ImageData(bytes, width, height);
};

const drawScaled = (context: CanvasRenderingContext2D, input: DisplayInput): DisplayGeometry => {
  const geometry = displayGeometry({
    image: input.image,
    scan: input.scan,
    overscan: input.settings.overscan
  });
  const source = new OffscreenCanvas(input.image.width, input.image.height);
  required(source.getContext('2d'), 'offscreen 2D canvas context').putImageData(
    toImageData(input),
    0,
    0
  );
  sizeCanvas(context.canvas, geometry.width, geometry.height);
  context.imageSmoothingEnabled = true;
  const cropX = input.image.width * geometry.crop;
  const cropY = input.image.height * geometry.crop;
  context.drawImage(
    source,
    cropX,
    cropY,
    input.image.width - 2 * cropX,
    input.image.height - 2 * cropY,
    0,
    0,
    geometry.width,
    geometry.height
  );
  return geometry;
};

export const create2dDisplay = (canvas: HTMLCanvasElement): Display => {
  const context = required(canvas.getContext('2d'), '2D canvas context');
  return { kind: DisplayKind.Canvas2d, canvas, draw: (input) => drawScaled(context, input) };
};
