import { describe, expect, it } from 'vitest';

import { createMemoryStore } from './createMemoryStore';
import { readNative } from './readNative';

describe('readNative', () => {
  it('reads the source frame a field shows as an RGBA image', async () => {
    // Arrange
    const store = createMemoryStore();
    await store.append(Uint8Array.from([1, 2, 3, 255]));
    await store.append(Uint8Array.from([4, 5, 6, 255]));
    const frames = await store.seal(4);

    // Act
    const image = await readNative({
      frames,
      sources: Uint32Array.from([0, 0, 1]),
      field: 2,
      width: 1,
      height: 1
    });

    // Assert
    expect([image.width, image.height, ...image.data]).toEqual([1, 1, 4, 5, 6, 255]);
  });
});
