import { Locale } from './locale';

const BY_LANGUAGE: Readonly<Record<string, Locale>> = {
  en: Locale.En,
  pt: Locale.PtBr,
  ja: Locale.Ja
};

const fromTag = (tag: string): Locale | null => {
  const language = tag.toLowerCase().replace(/-.*$/, '');
  return Object.entries(BY_LANGUAGE).find(([key]) => key === language)?.[1] ?? null;
};

export const detectLocale = (preferred: readonly string[], saved: string | null = null): Locale => {
  const chosen = Object.values(Locale).find((locale) => locale === saved);
  if (chosen !== undefined) {
    return chosen;
  }
  return preferred.map(fromTag).find((locale) => locale !== null) ?? Locale.En;
};
