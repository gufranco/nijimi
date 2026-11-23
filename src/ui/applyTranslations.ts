import { EN } from '../i18n/en';
import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { MessageKey } from '../i18n/types';
import { OPTION_TABLES } from './optionTables';
import type { OptionEntry } from './optionTables';

const isKey = (value: string | null): value is MessageKey =>
  value !== null && Object.hasOwn(EN, value);

const optionLabel = (locale: Locale, option: OptionEntry): string =>
  'label' in option ? translate(locale, option.label) : option.text;

const fillSelect = (
  select: HTMLSelectElement,
  options: readonly OptionEntry[],
  locale: Locale
): void => {
  const chosen = select.value;
  select.replaceChildren(
    ...options.map(
      (option) =>
        new Option(optionLabel(locale, option), option.value, false, option.value === chosen)
    )
  );
};

export const applyTranslations = (doc: Document, locale: Locale): void => {
  doc.documentElement.setAttribute('lang', locale);
  doc.querySelector('title')?.replaceChildren(translate(locale, 'documentTitle'));
  doc
    .querySelector('meta[name="description"]')
    ?.setAttribute('content', translate(locale, 'documentDescription'));
  doc.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    element.replaceChildren(isKey(key) ? translate(locale, key) : '');
  });
  doc.querySelectorAll('[data-i18n-label]').forEach((element) => {
    const key = element.getAttribute('data-i18n-label');
    element.setAttribute('aria-label', isKey(key) ? translate(locale, key) : '');
  });
  Object.entries(OPTION_TABLES).forEach(([name, options]) => {
    doc.querySelectorAll<HTMLSelectElement>(`select[name="${name}"]`).forEach((select) => {
      fillSelect(select, options, locale);
    });
  });
};
