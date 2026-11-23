import { describe, expect, it } from 'vitest';

import { startWorker } from './startWorker';

describe('startWorker', () => {
  it('listens for requests inside a worker scope', () => {
    // Arrange
    const listened: string[] = [];
    const scope = {
      WorkerGlobalScope: true,
      addEventListener: (type: string) => {
        listened.splice(listened.length, 0, type);
      },
      postMessage: () => undefined
    };

    // Act
    const started = startWorker(scope, () => Promise.resolve({ message: null, transfer: [] }));

    // Assert
    expect(started).toBe(true);
    expect(listened).toEqual(['message']);
  });

  it('does nothing on the page itself', () => {
    // Arrange
    const scope = globalThis;

    // Act
    const started = startWorker(scope, () => Promise.resolve({ message: null, transfer: [] }));

    // Assert
    expect(started).toBe(false);
  });
});
