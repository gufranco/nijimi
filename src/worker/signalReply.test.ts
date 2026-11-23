import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { signalReply } from './signalReply';

describe('signalReply', () => {
  it('transfers the rendered pixels of a valid request', async () => {
    // Arrange
    const request = {
      id: 1,
      frames: [{ width: 2, height: 1, data: new Float32Array(6) }],
      settings: DEFAULT_SETTINGS.signal
    };

    // Act
    const reply = await signalReply(request);

    // Assert
    expect(reply.transfer).toHaveLength(1);
  });

  it('transfers nothing with an error answer', async () => {
    // Arrange
    const request = { id: 2 };

    // Act
    const reply = await signalReply(request);

    // Assert
    expect(reply).toEqual({
      message: { id: 2, ok: false, message: 'invalid signal request' },
      transfer: []
    });
  });
});
