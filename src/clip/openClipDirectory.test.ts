import { afterEach, describe, expect, it } from 'vitest';

import { createLogger } from '../logging/createLogger';
import type { Logger } from '../logging/createLogger';
import { openClipDirectory } from './openClipDirectory';

const releases: (() => void)[] = [];

afterEach(async () => {
  releases.splice(0).forEach((release) => {
    release();
  });
  await (
    await navigator.storage.getDirectory()
  )
    .removeEntry('nijimi-clips', { recursive: true })
    .catch(() => undefined);
});

const held = (): Promise<void> =>
  new Promise((resolve) => {
    releases.splice(releases.length, 0, resolve);
  });

const sinkLogger = (sink: Error[]): Logger =>
  createLogger((error) => {
    sink.splice(sink.length, 0, error);
  });

const parent = async (): Promise<FileSystemDirectoryHandle> =>
  (await navigator.storage.getDirectory()).getDirectoryHandle('nijimi-clips', { create: true });

describe('openClipDirectory', () => {
  it('gives the tab its own directory and sweeps those left by tabs that are gone', async () => {
    // Arrange
    await (await parent()).getDirectoryHandle('closed-tab', { create: true });

    // Act
    const opened = await openClipDirectory({
      storage: navigator.storage,
      locks: navigator.locks,
      id: 'this-tab',
      held: held(),
      logger: sinkLogger([]),
      page: new EventTarget()
    });

    // Assert
    expect(opened?.directory.name).toBe('this-tab');
    expect(await Array.fromAsync((await parent()).keys())).toEqual(['this-tab']);
    await opened?.remove();
    expect(await Array.fromAsync((await parent()).keys())).toEqual([]);
  });

  it('leaves another open tab its directory', async () => {
    // Arrange
    await (await parent()).getDirectoryHandle('open-tab', { create: true });
    const other = held();
    void navigator.locks.request('nijimi-clips', { mode: 'shared' }, () => other);

    // Act
    const opened = await openClipDirectory({
      storage: navigator.storage,
      locks: navigator.locks,
      id: 'second-tab',
      held: held(),
      logger: sinkLogger([]),
      page: new EventTarget()
    });

    // Assert
    expect((await Array.fromAsync((await parent()).keys())).toSorted()).toEqual([
      'open-tab',
      'second-tab'
    ]);
    expect(opened?.directory.name).toBe('second-tab');
  });

  it('gives no directory when the browser refuses its private file system', async () => {
    // Arrange
    const storage: StorageManager = {
      estimate: () => navigator.storage.estimate(),
      persist: () => Promise.resolve(false),
      persisted: () => Promise.resolve(false),
      getDirectory: () => Promise.reject(new DOMException('refused', 'UnknownError'))
    };

    // Act
    const opened = await openClipDirectory({
      storage,
      locks: navigator.locks,
      id: 'refused-tab',
      held: held(),
      logger: sinkLogger([]),
      page: new EventTarget()
    });

    // Assert
    expect(opened).toBeNull();
  });

  it('logs when the lock that keeps the directory alive fails', async () => {
    // Arrange
    const sink: Error[] = [];
    const lost = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('lost'));
      }, 10);
    });
    const lostCheck = expect(lost).rejects.toThrow('lost');

    // Act
    await openClipDirectory({
      storage: navigator.storage,
      locks: navigator.locks,
      id: 'lock-tab',
      held: lost,
      logger: sinkLogger(sink),
      page: new EventTarget()
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Assert
    await lostCheck;
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'holding the clip storage lock failed'
    ]);
  });

  it('removes its directory when the page is hidden, and logs a removal that fails', async () => {
    // Arrange
    const sink: Error[] = [];
    const page = new EventTarget();
    await openClipDirectory({
      storage: navigator.storage,
      locks: navigator.locks,
      id: 'hidden-tab',
      held: held(),
      logger: sinkLogger(sink),
      page
    });

    // Act
    page.dispatchEvent(new Event('pagehide'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    page.dispatchEvent(new Event('pagehide'));
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(await Array.fromAsync((await parent()).keys())).toEqual([]);
    expect(sink.map((error) => error.message.split(' {')[0])).toEqual([
      'removing the clip storage on page hide failed'
    ]);
  });
});
