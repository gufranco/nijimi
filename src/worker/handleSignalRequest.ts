import { z } from 'zod';

import { simulateSignal } from '../signal/simulateSignal';
import { signalRequestSchema } from './signalRequestSchema';
import type { SignalResponse } from './types';

const idOnly = z.object({ id: z.number().int() });
const UNKNOWN_ID = -1;

export const handleSignalRequest = (message: unknown): SignalResponse => {
  const parsed = signalRequestSchema.safeParse(message);
  if (!parsed.success) {
    const id = idOnly.safeParse(message);
    return {
      id: id.success ? id.data.id : UNKNOWN_ID,
      ok: false,
      message: 'invalid signal request'
    };
  }
  return {
    id: parsed.data.id,
    ok: true,
    image: simulateSignal(parsed.data.frames, parsed.data.settings)
  };
};
