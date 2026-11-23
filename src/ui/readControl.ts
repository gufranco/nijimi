import { HASH_FIELDS } from '../settings/hashFields';
import type { AppSettings } from '../settings/types';

export const readControl = (
  settings: AppSettings,
  target: EventTarget | null
): AppSettings | null => {
  if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLSelectElement)) {
    return null;
  }
  const field = HASH_FIELDS.find((candidate) => candidate.key === target.name);
  if (field === undefined) {
    return null;
  }
  const isCheckbox = target instanceof HTMLInputElement && target.type === 'checkbox';
  return field.apply(settings, isCheckbox ? (target.checked ? '1' : '0') : target.value);
};
