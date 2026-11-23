import { describe, expect, it } from 'vitest';

import { encodeGif, lzwUncompressed } from './encodeGif';

describe('encodeGif', () => {
  it('packs clear and pixel codes three bits wide, least significant bit first', () => {
    // Arrange
    const pixels = [1, 2];

    // Act
    const stream = lzwUncompressed(pixels);

    // Assert
    expect(stream).toEqual([2, 0x0c, 0x55, 0]);
  });

  it('writes a looping GIF89a with a four-color table and one block per frame', () => {
    // Arrange
    const input = {
      width: 2,
      height: 1,
      palette: [
        [0, 0, 0],
        [255, 0, 0],
        [0, 0, 255],
        [255, 255, 255]
      ] as const,
      frames: [{ pixels: [1, 2], delayCentiseconds: 10 }]
    };

    // Act
    const bytes = encodeGif(input);

    // Assert
    expect([...bytes.slice(0, 13)]).toEqual([71, 73, 70, 56, 57, 97, 2, 0, 1, 0, 0x91, 0, 0]);
    expect([...bytes.slice(44, 52)]).toEqual([0x21, 0xf9, 0x04, 0x04, 10, 0, 0, 0]);
    expect(bytes.at(-1)).toBe(0x3b);
    expect(bytes).toHaveLength(68);
  });
});
