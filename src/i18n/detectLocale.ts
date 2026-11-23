import { Locale } from './locale';

const fromTag = (tag: string): Locale | null => {
  const language = tag.toLowerCase().split('-')[0];
  if (language === 'pt') {
    return Locale.PtBr;
  }
  return language === 'en' ? Locale.En : null;
};

export const detectLocale = (preferred: readonly string[], saved: string | null = null): Locale => {
  const chosen = Object.values(Locale).find((locale) => locale === saved);
  if (chosen !== undefined) {
    return chosen;
  }
  return preferred.map(fromTag).find((locale) => locale !== null) ?? Locale.En;
};
