import { describe, expect, it } from 'vitest';

import { readPngHeader } from './readPngHeader';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR = [0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52];

const header = (width: number, height: number): Uint8Array =>
  Uint8Array.from([
    ...SIGNATURE,
    ...IHDR,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff
  ]);

describe('readPngHeader', () => {
  it('reads the width and height from the IHDR chunk', () => {
    // Arrange
    const bytes = header(320, 224);

    // Act
    const size = readPngHeader(bytes);

    // Assert
    expect(size).toEqual({ width: 320, height: 224 });
  });

  it('refuses bytes without the PNG signature', () => {
    // Arrange
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, ...header(1, 1).slice(4)]);

    // Act
    const size = readPngHeader(bytes);

    // Assert
    expect(size).toBeNull();
  });

  it('refuses a signature followed by something other than IHDR', () => {
    // Arrange
    const bytes = Uint8Array.from([
      ...SIGNATURE,
      0,
      0,
      0,
      13,
      0x49,
      0x44,
      0x41,
      0x54,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ]);

    // Act
    const size = readPngHeader(bytes);

    // Assert
    expect(size).toBeNull();
  });

  it('refuses a file shorter than the header', () => {
    // Arrange
    const bytes = Uint8Array.from(SIGNATURE);

    // Act
    const size = readPngHeader(bytes);

    // Assert
    expect(size).toBeNull();
  });
});
