import { DEFAULT_SETTINGS } from './defaultSettings';
import { HASH_FIELDS } from './hashFields';
import type { ParsedSettings } from './types';

const MAX_PARAMETERS = 64;

export const parseHash = (hash: string): ParsedSettings => {
  const entries = Array.from(new URLSearchParams(hash.replace(/^#/, ''))).slice(0, MAX_PARAMETERS);
  return entries.reduce<ParsedSettings>(
    (parsed, [key, value]) => {
      const applied =
        HASH_FIELDS.find((candidate) => candidate.key === key)?.apply(parsed.settings, value) ??
        null;
      return applied === null
        ? { settings: parsed.settings, invalid: [...parsed.invalid, `${key}=${value}`] }
        : { settings: applied, invalid: parsed.invalid };
    },
    { settings: DEFAULT_SETTINGS, invalid: [] }
  );
};
