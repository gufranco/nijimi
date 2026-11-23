import { describe, expect, it } from 'vitest';

import { openFrameStore } from './openFrameStore';

describe('openFrameStore', () => {
  it('keeps frames in memory when there is no storage directory', async () => {
    // Arrange
    const store = await openFrameStore({ clips: null, name: 'unused' });
    await store.append(Uint8Array.from([9]));

    // Act
    const reader = await store.seal(1);

    // Assert
    expect([...(await reader.read(0))]).toEqual([9]);
  });

  it('writes frames to a file in the given directory', async () => {
    // Arrange
    const directory = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle('open-store-test', { create: true });
    const store = await openFrameStore({
      clips: { directory, remove: () => Promise.resolve() },
      name: 'fields'
    });
    await store.append(Uint8Array.from([7, 8]));

    // Act
    const reader = await store.seal(2);

    // Assert
    expect(await Array.fromAsync(directory.keys())).toEqual(['fields']);
    await reader.discard();
  });
});
