import { describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { Connection } from '../signal/connection';
import { applyTranslations } from './applyTranslations';
import { readControl } from './readControl';
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

describe('readControl', () => {
  it('applies a changed control through the link field of the same name', () => {
    // Arrange
    const { doc, form } = mount();
    writeControls(form, DEFAULT_SETTINGS);
    const rgb = doc.querySelector<HTMLInputElement>('input[name=c][value=rgb]');
    rgb?.click();

    // Act
    const settings = readControl(DEFAULT_SETTINGS, rgb);

    // Assert
    expect(settings?.signal.connection).toBe(Connection.Rgb);
  });

  it('reads a checkbox as 1 or 0', () => {
    // Arrange
    const { doc } = mount();
    const overscan = doc.querySelector<HTMLInputElement>('input[name=os]');
    overscan?.click();

    // Act
    const settings = readControl(DEFAULT_SETTINGS, overscan);

    // Assert
    expect(settings?.display.overscan).toBe(true);
  });

  it('reads an unticked checkbox as 0', () => {
    // Arrange
    const { doc } = mount();
    const overscan = doc.querySelector<HTMLInputElement>('input[name=os]');
    const ticked = {
      ...DEFAULT_SETTINGS,
      display: { ...DEFAULT_SETTINGS.display, overscan: true }
    };

    // Act
    const settings = readControl(ticked, overscan);

    // Assert
    expect(settings?.display.overscan).toBe(false);
  });

  it('ignores an event from something that is not a setting control', () => {
    // Arrange
    const { doc } = mount();
    const button = doc.querySelector('#export-button');

    // Act
    const settings = readControl(DEFAULT_SETTINGS, button);

    // Assert
    expect(settings).toBeNull();
  });

  it('ignores a control whose name is not a link field', () => {
    // Arrange
    const input = document.createElement('input');
    input.name = 'zoom';

    // Act
    const settings = readControl(DEFAULT_SETTINGS, input);

    // Assert
    expect(settings).toBeNull();
  });

  it('refuses an out-of-range value typed into a number field', () => {
    // Arrange
    const { doc } = mount();
    const cycles = doc.querySelector<HTMLInputElement>('input[name=cl]');
    cycles?.setAttribute('value', '999');
    cycles?.form?.reset();

    // Act
    const settings = readControl(DEFAULT_SETTINGS, cycles);

    // Assert
    expect(settings).toBeNull();
  });
});
