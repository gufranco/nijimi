import { describe, expect, it } from 'vitest';

import { createMemoryStore } from './createMemoryStore';

describe('createMemoryStore', () => {
  it('reads back each appended frame by index and an empty frame past the end', async () => {
    // Arrange
    const store = createMemoryStore();
    await store.append(Uint8Array.from([1, 2]));
    await store.append(Uint8Array.from([3, 4]));

    // Act
    const reader = await store.seal(2);

    // Assert
    expect(reader.count).toBe(2);
    expect([...(await reader.read(1)), ...(await reader.read(2))]).toEqual([3, 4]);
    await expect(reader.discard()).resolves.toBeUndefined();
  });
});
