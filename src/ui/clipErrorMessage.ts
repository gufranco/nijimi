import type { MessageKey } from '../i18n/types';
import { InputError } from '../input/inputError';

const MESSAGES: Readonly<Record<InputError, MessageKey>> = {
  [InputError.NotPng]: 'errorUnsupportedClip',
  [InputError.UnsupportedClip]: 'errorUnsupportedClip',
  [InputError.FileTooBig]: 'errorClipCorrupt',
  [InputError.TooLarge]: 'errorClipTooLarge',
  [InputError.Corrupt]: 'errorClipCorrupt'
};

export const clipErrorMessage = (error: InputError): MessageKey => MESSAGES[error];
