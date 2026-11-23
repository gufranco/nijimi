import { EN } from './en';
import { Locale } from './locale';
import { PT_BR } from './ptBr';
import type { MessageKey, Messages } from './types';

const CATALOGS: Readonly<Record<Locale, Messages>> = {
  [Locale.En]: EN,
  [Locale.PtBr]: PT_BR
};

export const translate = (
  locale: Locale,
  key: MessageKey,
  params: Readonly<Record<string, string>> = {}
): string =>
  CATALOGS[locale][key].replace(/\{([a-z]+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(params, name) ? String(params[name]) : placeholder
  );
