import { describe, expect, it } from 'vitest';

import { crc32 } from './crc32';

const ascii = (text: string): Uint8Array =>
  Uint8Array.from(text, (character) => character.charCodeAt(0));

describe('crc32', () => {
  it('matches the CRC every PNG stores after its IEND chunk type', () => {
    // Arrange
    const bytes = ascii('IEND');

    // Act
    const value = crc32(bytes);

    // Assert
    expect(value).toBe(0xae426082);
  });

  it('matches the standard check value for 123456789', () => {
    // Arrange
    const bytes = ascii('123456789');

    // Act
    const value = crc32(bytes);

    // Assert
    expect(value).toBe(0xcbf43926);
  });
});
