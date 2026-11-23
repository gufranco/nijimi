import { HASH_FIELDS } from '../settings/hashFields';
import type { AppSettings } from '../settings/types';

const writeDefault = (form: HTMLFormElement, key: string, value: string): void => {
  form.querySelectorAll(`[name="${key}"]`).forEach((control) => {
    if (control instanceof HTMLSelectElement) {
      Array.from(control.options).forEach((option) =>
        option.toggleAttribute('selected', option.value === value)
      );
      return;
    }
    if (
      control instanceof HTMLInputElement &&
      (control.type === 'radio' || control.type === 'checkbox')
    ) {
      control.toggleAttribute(
        'checked',
        control.type === 'radio' ? control.value === value : value === '1'
      );
      return;
    }
    control.setAttribute('value', value);
  });
  form.querySelector(`#output-${key}`)?.replaceChildren(value);
};

export const writeControls = (form: HTMLFormElement, settings: AppSettings): void => {
  HASH_FIELDS.forEach((field) => {
    writeDefault(form, field.key, field.read(settings));
  });
  form.reset();
};
