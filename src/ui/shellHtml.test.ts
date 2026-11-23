import { describe, expect, it } from 'vitest';

import { EN } from '../i18n/en';
import { HASH_FIELDS } from '../settings/hashFields';
import { SHELL_HTML } from './shellHtml';

const parse = (): DocumentFragment => document.createRange().createContextualFragment(SHELL_HTML);

describe('SHELL_HTML', () => {
  it('only names messages the catalog defines', () => {
    // Arrange
    const shell = parse();

    // Act
    const keys = Array.from(shell.querySelectorAll('[data-i18n], [data-i18n-label]')).flatMap(
      (element) => [element.getAttribute('data-i18n'), element.getAttribute('data-i18n-label')]
    );

    // Assert
    const known = new Set(Object.keys(EN));
    expect(keys.filter((key) => key !== null && !known.has(key))).toEqual([]);
  });

  it('names every setting control after its link key', () => {
    // Arrange
    const shell = parse();

    // Act
    const names = new Set(
      Array.from(shell.querySelectorAll<HTMLInputElement>('#controls [name]')).map(
        (control) => control.name
      )
    );

    // Assert
    const keys = new Set(
      HASH_FIELDS.map((field) => field.key).filter((key) => key !== 'seed' && key !== 'l')
    );
    expect(names).toEqual(keys);
  });

  it('gives every form control a label', () => {
    // Arrange
    const shell = parse();

    // Act
    const unlabelled = Array.from(
      shell.querySelectorAll<HTMLInputElement>('input:not([type=radio]):not([type=file]), select')
    ).filter(
      (control) =>
        control.closest('label') === null &&
        shell.querySelector(`label[for="${control.id}"]`) === null
    );

    // Assert
    expect(unlabelled.map((control) => control.id || control.name)).toEqual([]);
  });
});
