import type { RgbaImage } from './types';

type ContextFactory = (width: number, height: number) => OffscreenCanvasRenderingContext2D | null;

const offscreenContext: ContextFactory = (width, height) =>
  new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });

export const decodePng = async (
  blob: Blob,
  contextFor: ContextFactory = offscreenContext
): Promise<RgbaImage> => {
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none'
  });
  const { width, height } = bitmap;
  const context = contextFor(width, height);
  if (context === null) {
    bitmap.close();
    throw new Error('OffscreenCanvas 2D context is unavailable');
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = context.getImageData(0, 0, width, height, { colorSpace: 'srgb' });
  return { width, height, data: pixels.data };
};
