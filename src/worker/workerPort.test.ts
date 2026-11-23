import { describe, expect, it } from 'vitest';

import { workerPort } from './workerPort';

describe('workerPort', () => {
  it('posts with the transfer list as options and forwards message listeners', () => {
    // Arrange
    const calls: unknown[] = [];
    const scope = {
      addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
        calls.splice(calls.length, 0, ['listen', type, typeof listener]);
      },
      postMessage: (message: unknown, options: StructuredSerializeOptions) => {
        calls.splice(calls.length, 0, ['post', message, options.transfer?.length]);
      }
    };
    const port = workerPort(scope);

    // Act
    port.addEventListener('message', () => undefined);
    port.postMessage('done', [new ArrayBuffer(4)]);

    // Assert
    expect(calls).toEqual([
      ['listen', 'message', 'function'],
      ['post', 'done', 1]
    ]);
  });
});
