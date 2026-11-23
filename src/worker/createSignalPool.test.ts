import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import type { SignalClient } from './createSignalClient';
import { createSignalPool } from './createSignalPool';

const workers: Worker[] = [];

afterEach(() => {
  workers.splice(0).forEach((worker) => {
    worker.terminate();
  });
});

const createWorker = (): Worker => {
  const worker = new Worker(new URL('./signal.worker.ts', import.meta.url), { type: 'module' });
  workers.splice(workers.length, 0, worker);
  return worker;
};

describe('createSignalPool', () => {
  it('adds workers beside the first client once, on first use, and each one renders', async () => {
    // Arrange
    const first: SignalClient = { render: () => Promise.reject(new Error('not used')) };
    const pool = createSignalPool({
      first,
      deps: { createWorker, workerCount: 3 },
      timeoutMs: 30_000
    });
    const created = workers.length;

    // Act
    const clients = pool();
    const again = pool();
    const image = await clients[2]?.render(
      [{ width: 4, height: 1, data: new Float32Array(12) }],
      DEFAULT_SETTINGS.signal
    );

    // Assert
    expect([
      created,
      workers.length,
      clients.length,
      again === clients,
      clients[0] === first
    ]).toEqual([0, 2, 3, true, true]);
    expect(image?.height).toBe(1);
  });
});
