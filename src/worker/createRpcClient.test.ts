import { describe, expect, it } from 'vitest';

import { createRpcClient } from './createRpcClient';
import type { RpcAnswer } from './createRpcClient';

const readNumber = (data: unknown): RpcAnswer<number> | null =>
  typeof data === 'object' && data !== null && 'id' in data && typeof data.id === 'number'
    ? { id: data.id, ok: true, value: 7 }
    : null;

const echoWorker = (
  answer: (id: number) => unknown
): EventTarget & { readonly postMessage: (message: unknown) => void } => {
  const target = new EventTarget();
  return Object.assign(target, {
    postMessage: (message: unknown) => {
      const id =
        typeof message === 'object' && message !== null && 'id' in message
          ? Number(message.id)
          : -1;
      queueMicrotask(() => target.dispatchEvent(new MessageEvent('message', { data: answer(id) })));
    }
  });
};

describe('createRpcClient', () => {
  it('posts the payload with an id and resolves with the decoded answer', async () => {
    // Arrange
    const client = createRpcClient({
      worker: echoWorker((id) => ({ id })),
      timeoutMs: 1000,
      label: 'test worker',
      read: readNumber
    });

    // Act
    const value = await client.call({ question: 'x' });

    // Assert
    expect(value).toBe(7);
  });

  it('rejects with the message of a failed answer', async () => {
    // Arrange
    const read = (data: unknown): RpcAnswer<number> | null =>
      typeof data === 'object' && data !== null && 'id' in data && typeof data.id === 'number'
        ? { id: data.id, ok: false, message: 'refused' }
        : null;
    const client = createRpcClient({
      worker: echoWorker((id) => ({ id })),
      timeoutMs: 1000,
      label: 'test worker',
      read
    });

    // Act
    const calling = client.call({});

    // Assert
    await expect(calling).rejects.toThrow('refused');
  });

  it('names the worker in a timeout', async () => {
    // Arrange
    const silent = Object.assign(new EventTarget(), { postMessage: () => undefined });
    const client = createRpcClient({
      worker: silent,
      timeoutMs: 10,
      label: 'test worker',
      read: readNumber
    });

    // Act
    const calling = client.call({});

    // Assert
    await expect(calling).rejects.toThrow('test worker timed out after 10 ms');
  });
});
