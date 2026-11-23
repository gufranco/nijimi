import { fieldCount } from '../clip/fieldCount';
import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { LoadedClip } from '../input/types';

const MAX_RATE_DIGITS = 2;

export const describeClip = (
  locale: Locale,
  clip: LoadedClip | null,
  fieldRate: number
): string => {
  if (clip === null) {
    return '';
  }
  const rate = new Intl.NumberFormat(locale, { maximumFractionDigits: MAX_RATE_DIGITS });
  return `, ${translate(locale, 'clipInfo', {
    fields: String(fieldCount(clip.duration, fieldRate)),
    rate: rate.format(fieldRate)
  })}`;
};
