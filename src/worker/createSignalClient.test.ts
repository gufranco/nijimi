import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { createSignalClient } from './createSignalClient';

const FRAME = { width: 8, height: 2, data: new Float32Array(48).fill(0.5) };

const realWorker = (): Worker =>
  new Worker(new URL('./signal.worker.ts', import.meta.url), { type: 'module' });

describe('createSignalClient', () => {
  it('resolves each render with the worker result', async () => {
    // Arrange
    const worker = realWorker();
    const client = createSignalClient({ worker, timeoutMs: 10_000 });

    // Act
    const image = await client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Assert
    worker.terminate();
    expect(image.height).toBe(2);
  });

  it('rejects a render the worker refuses', async () => {
    // Arrange
    const worker = realWorker();
    const client = createSignalClient({ worker, timeoutMs: 10_000 });

    // Act
    const rendering = client.render(
      [{ ...FRAME, data: new Float32Array(3) }],
      DEFAULT_SETTINGS.signal
    );

    // Assert
    await expect(rendering).rejects.toThrow('invalid signal request');
    worker.terminate();
  });

  it('rejects a render that outlives its timeout', async () => {
    // Arrange
    const silent = new EventTarget();
    const worker = Object.assign(silent, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 20 });

    // Act
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Assert
    await expect(rendering).rejects.toThrow('signal worker timed out after 20 ms');
  });

  it('rejects every pending render when the worker crashes', async () => {
    // Arrange
    const target = new EventTarget();
    const worker = Object.assign(target, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 10_000 });
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Act
    target.dispatchEvent(new ErrorEvent('error', { message: 'boom' }));

    // Assert
    await expect(rendering).rejects.toThrow('signal worker failed: boom');
  });

  it('names an unknown error when the worker crashes without an ErrorEvent', async () => {
    // Arrange
    const target = new EventTarget();
    const worker = Object.assign(target, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 10_000 });
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Act
    target.dispatchEvent(new Event('error'));

    // Assert
    await expect(rendering).rejects.toThrow('signal worker failed: unknown error');
  });

  it('ignores a message that is not a signal response', async () => {
    // Arrange
    const target = new EventTarget();
    const worker = Object.assign(target, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 30 });
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Act
    target.dispatchEvent(new MessageEvent('message', { data: 'noise' }));
    target.dispatchEvent(new Event('message'));

    // Assert
    await expect(rendering).rejects.toThrow('timed out');
  });

  it('ignores a successful answer for a render it never asked for', async () => {
    // Arrange
    const target = new EventTarget();
    const worker = Object.assign(target, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 30 });
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);
    const stray = {
      id: 999,
      ok: true,
      image: { width: 1, height: 1, data: new Float32Array(3), sampleAspect: 1, frameCount: 1 }
    };

    // Act
    target.dispatchEvent(new MessageEvent('message', { data: stray }));

    // Assert
    await expect(rendering).rejects.toThrow('timed out');
  });

  it('ignores an answer for a render it never asked for', async () => {
    // Arrange
    const target = new EventTarget();
    const worker = Object.assign(target, { postMessage: () => undefined });
    const client = createSignalClient({ worker, timeoutMs: 30 });
    const rendering = client.render([FRAME], DEFAULT_SETTINGS.signal);

    // Act
    target.dispatchEvent(
      new MessageEvent('message', { data: { id: 999, ok: false, message: 'stray' } })
    );

    // Assert
    await expect(rendering).rejects.toThrow('timed out');
  });
});
