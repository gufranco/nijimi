import { describe, expect, it } from 'vitest';

import { crc32 } from './crc32';
import { verifyPng } from './verifyPng';

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const u32 = (value: number): number[] => [
  (value >>> 24) & 0xff,
  (value >>> 16) & 0xff,
  (value >>> 8) & 0xff,
  value & 0xff
];

const chunk = (type: string, data: readonly number[], crcFix = 0): number[] => {
  const body = Uint8Array.from([
    ...Array.from(type, (character) => character.charCodeAt(0)),
    ...data
  ]);
  return [...u32(data.length), ...body, ...u32((crc32(body) ^ crcFix) >>> 0)];
};

const header = chunk('IHDR', [...u32(1), ...u32(1), 8, 2, 0, 0, 0]);
const end = chunk('IEND', []);

const realPng = async (): Promise<Uint8Array> => {
  const canvas = new OffscreenCanvas(3, 2);
  canvas.getContext('2d')?.fillRect(0, 0, 3, 2);
  return new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer());
};

describe('verifyPng', () => {
  it('accepts a PNG the browser encoded', async () => {
    // Arrange
    const bytes = await realPng();

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toBeNull();
  });

  it('refuses compressed data that does not inflate', async () => {
    // Arrange
    const bytes = Uint8Array.from([
      ...SIGNATURE,
      ...header,
      ...chunk('IDAT', [1, 2, 3, 4, 5, 6, 7, 8]),
      ...end
    ]);

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toMatch(/^image data does not inflate: /);
  });

  it('refuses a chunk whose CRC does not match', async () => {
    // Arrange
    const good = await realPng();
    const bytes = good.with(good.length - 1, (good.at(-1) ?? 0) ^ 0xff);

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toBe(`chunk at byte ${String(good.length - 12)} fails its CRC`);
  });

  it('refuses a file cut off before IEND', async () => {
    // Arrange
    const good = await realPng();
    const bytes = good.slice(0, good.length - 12);

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toBe('the file ends before IEND');
  });

  it('refuses a chunk that claims more bytes than the file holds', async () => {
    // Arrange
    const bytes = Uint8Array.from([...SIGNATURE, ...u32(9999), 0x49, 0x44, 0x41, 0x54, 1, 2]);

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toBe('chunk at byte 8 runs past the end of the file');
  });

  it('refuses a PNG with no image data', async () => {
    // Arrange
    const bytes = Uint8Array.from([...SIGNATURE, ...header, ...end]);

    // Act
    const problem = await verifyPng(bytes);

    // Assert
    expect(problem).toBe('the file holds no image data');
  });
});
