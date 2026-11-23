import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { applyTranslations } from './applyTranslations';
import { writeControls } from './writeControls';
import { SHELL_HTML } from './shellHtml';

const mount = (): { readonly doc: Document; readonly form: HTMLFormElement } => {
  const doc = document.implementation.createHTMLDocument('t');
  doc.body.innerHTML = SHELL_HTML;
  applyTranslations(doc, Locale.En);
  const form = doc.querySelector<HTMLFormElement>('#controls');
  if (form === null) {
    throw new Error('the shell has no form');
  }
  return { doc, form };
};

describe('writeControls', () => {
  it('shows every setting in its control and range output', () => {
    // Arrange
    const { doc, form } = mount();
    const settings = {
      ...DEFAULT_SETTINGS,
      display: { ...DEFAULT_SETTINGS.display, overscan: true }
    };

    // Act
    writeControls(form, settings);

    // Assert
    expect(doc.querySelector<HTMLInputElement>('input[name=c]:checked')?.value).toBe('composite');
    expect(doc.querySelector<HTMLSelectElement>('select[name=p]')?.value).toBe('genesis-h40');
    expect(doc.querySelector<HTMLInputElement>('input[name=os]')?.checked).toBe(true);
    expect(doc.querySelector<HTMLInputElement>('input[name=sl]')?.value).toBe('0.6');
    expect(doc.querySelector('#output-sl')?.textContent).toBe('0.6');
  });
});
