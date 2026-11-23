import { DEFAULT_SETTINGS } from './defaultSettings';
import { HASH_FIELDS } from './hashFields';
import type { AppSettings } from './types';

export const serializeHash = (settings: AppSettings): string => {
  const changed = HASH_FIELDS.flatMap((field) => {
    const value = field.read(settings);
    return value === field.read(DEFAULT_SETTINGS) ? [] : [[field.key, value] as const];
  });
  const query = new URLSearchParams(changed.map(([key, value]) => [key, value])).toString();
  return query === '' ? '' : `#${query}`;
};
