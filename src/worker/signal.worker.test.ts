import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import type { SignalResponse } from './types';

describe('signal worker', () => {
  it('renders a request in a real Worker and transfers the result back', async () => {
    // Arrange
    const worker = new Worker(new URL('./signal.worker.ts', import.meta.url), { type: 'module' });
    const request = {
      id: 42,
      frames: [{ width: 8, height: 2, data: new Float32Array(48).fill(0.5) }],
      settings: DEFAULT_SETTINGS.signal
    };
    const answer = new Promise<SignalResponse>((resolve) => {
      worker.addEventListener('message', (event: MessageEvent<SignalResponse>) => {
        resolve(event.data);
      });
    });

    // Act
    worker.postMessage(request);

    // Assert
    const response = await answer;
    worker.terminate();
    expect(response.id).toBe(42);
    expect(response.ok ? response.image.data : null).toBeInstanceOf(Float32Array);
  });

  it('exports nothing and stays inert when the entry is loaded on the page', async () => {
    // Arrange
    const load = (): Promise<object> => import('./signal.worker');

    // Act
    const entry: object = await load();

    // Assert
    expect(Object.keys(entry)).toEqual([]);
  });
});
