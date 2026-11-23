import { detectScale } from './detectScale';
import type { RgbaImage } from './types';

export const chooseScale = (
  image: RgbaImage,
  override: number
): { readonly scale: number; readonly detected: number } => {
  const detected = detectScale(image);
  const fits = override > 0 && image.width % override === 0 && image.height % override === 0;
  return { scale: fits ? override : detected, detected };
};
