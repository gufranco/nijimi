import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { applyTranslations } from './applyTranslations';

const page = (): Document => {
  const doc = document.implementation.createHTMLDocument('x');
  doc.head.innerHTML = '<title></title><meta name="description" content="">';
  doc.body.innerHTML =
    '<p data-i18n="choosePng"></p><div data-i18n-label="crtScreenLabel"></div><select name="s"></select><select name="x"></select>';
  return doc;
};

describe('applyTranslations', () => {
  it('writes text, labels, options, title, description and lang in Portuguese', () => {
    // Arrange
    const doc = page();

    // Act
    applyTranslations(doc, Locale.PtBr);

    // Assert
    expect(doc.querySelector('p')?.textContent).toBe('Escolher PNG');
    expect(doc.querySelector('div')?.getAttribute('aria-label')).toBe('Prévia em CRT');
    expect(doc.title).toBe('nijimi: prévia CRT para pixel art');
    expect(doc.documentElement.lang).toBe('pt-BR');
    expect(doc.querySelector('meta[name=description]')?.getAttribute('content')).toContain(
      'navegador'
    );
    expect(
      Array.from(doc.querySelectorAll('select[name=s] option'), (option) => option.textContent)
    ).toEqual(['NTSC', 'PAL-B/G', 'PAL-M']);
    expect(doc.querySelector('select[name=x] option[value="2"]')?.textContent).toBe('2x');
  });

  it('keeps the chosen option when the language changes', () => {
    // Arrange
    const doc = page();
    applyTranslations(doc, Locale.En);
    const standard = doc.querySelector<HTMLSelectElement>('select[name=s]');
    if (standard !== null) {
      standard.value = 'pal-m';
    }

    // Act
    applyTranslations(doc, Locale.PtBr);

    // Assert
    expect(standard?.value).toBe('pal-m');
  });

  it('still sets the language on a page with no title or description', () => {
    // Arrange
    const doc = page();
    doc.head.replaceChildren();

    // Act
    applyTranslations(doc, Locale.En);

    // Assert
    expect(doc.documentElement.lang).toBe('en');
    expect(doc.querySelector('title')).toBeNull();
  });

  it('clears an element that names an unknown message', () => {
    // Arrange
    const doc = page();
    doc.body.innerHTML = '<p data-i18n="nope">stale</p><div data-i18n-label="nope"></div>';

    // Act
    applyTranslations(doc, Locale.En);

    // Assert
    expect(doc.querySelector('p')?.textContent).toBe('');
    expect(doc.querySelector('div')?.getAttribute('aria-label')).toBe('');
  });
});
