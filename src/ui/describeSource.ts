import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { LoadedImage } from '../input/types';

export const describeSource = (locale: Locale, image: LoadedImage): string => {
  const size = translate(locale, 'nativeSize', {
    width: String(image.frame.width),
    height: String(image.frame.height)
  });
  return image.detectedScale === 1
    ? size
    : `${size}, ${translate(locale, 'scaleDetected', { scale: String(image.detectedScale) })}`;
};
