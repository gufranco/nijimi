import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { registerWorker } from './registerWorker';
import { signalReply } from './signalReply';
import type { MessagePort, WorkerHandler } from './types';

interface Posted {
  readonly message: unknown;
  readonly transfer: Transferable[];
}

interface FakeScope {
  readonly send: (data: unknown) => void;
  readonly posted: Posted[];
  readonly scope: MessagePort;
}

const fakeScope = (): FakeScope => {
  const listeners: ((event: MessageEvent) => void)[] = [];
  const posted: Posted[] = [];
  return {
    posted,
    send: (data) => {
      listeners.forEach((listener) => {
        listener(new MessageEvent('message', { data }));
      });
    },
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

const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

describe('registerWorker', () => {
  it('answers a signal request and transfers the rendered pixels', async () => {
    // Arrange
    const fake = fakeScope();
    registerWorker(fake.scope, signalReply);
    const request = {
      id: 1,
      frames: [{ width: 2, height: 1, data: new Float32Array(6) }],
      settings: DEFAULT_SETTINGS.signal
    };

    // Act
    fake.send(request);
    await settle();

    // Assert
    expect(fake.posted).toHaveLength(1);
    expect(fake.posted[0]?.transfer).toHaveLength(1);
  });

  it('posts the handler reply with its transfer list', async () => {
    // Arrange
    const fake = fakeScope();
    const buffer = new ArrayBuffer(8);
    const handle: WorkerHandler = (data) =>
      Promise.resolve({ message: { echo: data }, transfer: [buffer] });
    registerWorker(fake.scope, handle);

    // Act
    fake.send('ping');
    await settle();

    // Assert
    expect(fake.posted).toEqual([{ message: { echo: 'ping' }, transfer: [buffer] }]);
  });

  it('answers a failing handler with an error and no transfer', async () => {
    // Arrange
    const fake = fakeScope();
    registerWorker(fake.scope, () => Promise.reject(new Error('handler broke')));

    // Act
    fake.send('ping');
    await settle();

    // Assert
    expect(fake.posted).toEqual([
      { message: { id: -1, ok: false, message: 'handler broke' }, transfer: [] }
    ]);
  });
});
