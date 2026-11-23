import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { registerWorker } from './registerWorker';
import type { MessagePort } from './types';

interface FakeScope {
  readonly listeners: ((event: MessageEvent) => void)[];
  readonly posted: { message: unknown; transfer: Transferable[] }[];
  readonly scope: MessagePort;
}

const fakeScope = (): FakeScope => {
  const listeners: ((event: MessageEvent) => void)[] = [];
  const posted: { message: unknown; transfer: Transferable[] }[] = [];
  return {
    listeners,
    posted,
    scope: {
      addEventListener: (_type: 'message', listener: (event: MessageEvent) => void) => {
        listeners.splice(listeners.length, 0, listener);
      },
      postMessage: (message: unknown, transfer: Transferable[]) => {
        posted.splice(posted.length, 0, { message, transfer });
      }
    }
  };
};

describe('registerWorker', () => {
  it('answers each message and transfers the rendered pixels', () => {
    // Arrange
    const fake = fakeScope();
    registerWorker(fake.scope);
    const request = {
      id: 1,
      frames: [{ width: 2, height: 1, data: new Float32Array(6) }],
      settings: DEFAULT_SETTINGS.signal
    };

    // Act
    fake.listeners.forEach((listener) => {
      listener(new MessageEvent('message', { data: request }));
    });

    // Assert
    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]?.transfer).toHaveLength(1);
  });

  it('transfers nothing with an error answer', () => {
    // Arrange
    const fake = fakeScope();
    registerWorker(fake.scope);

    // Act
    fake.listeners.forEach((listener) => {
      listener(new MessageEvent('message', { data: { id: 2 } }));
    });

    // Assert
    expect(fake.posted[0]).toEqual({
      message: { id: 2, ok: false, message: 'invalid signal request' },
      transfer: []
    });
  });
});
