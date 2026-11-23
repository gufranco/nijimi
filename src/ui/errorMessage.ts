import type { MessageKey } from '../i18n/types';
import { InputError } from '../input/inputError';

const MESSAGES: Readonly<Record<InputError, MessageKey>> = {
  [InputError.NotPng]: 'errorNotPng',
  [InputError.FileTooBig]: 'errorFileTooBig',
  [InputError.TooLarge]: 'errorTooLarge',
  [InputError.Corrupt]: 'errorCorrupt'
};

export const errorMessage = (error: InputError): MessageKey => MESSAGES[error];
