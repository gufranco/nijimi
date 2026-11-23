import { describe, expect, it } from 'vitest';

import { createOpfsStore } from './createOpfsStore';

describe('createOpfsStore', () => {
  it('appends frames to a file, reads each back by index and deletes the file on discard', async () => {
    // Arrange
    const directory = await (
      await navigator.storage.getDirectory()
    ).getDirectoryHandle('opfs-store-test', { create: true });
    const store = await createOpfsStore({ directory, name: 'frames' });
    await store.append(Uint8Array.from([1, 2, 3]));
    await store.append(Uint8Array.from([4, 5, 6]));

    // Act
    const reader = await store.seal(3);

    // Assert
    expect(reader.count).toBe(2);
    expect([...(await reader.read(1))]).toEqual([4, 5, 6]);
    await reader.discard();
    expect(await Array.fromAsync(directory.keys())).toEqual([]);
  });
});
