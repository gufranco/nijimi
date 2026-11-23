const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const IHDR_TYPE = [0x49, 0x48, 0x44, 0x52] as const;
const IHDR_TYPE_OFFSET = 12;
const WIDTH_OFFSET = 16;
const HEIGHT_OFFSET = 20;
const HEADER_LENGTH = 24;

const matches = (bytes: Uint8Array, expected: readonly number[], offset: number): boolean =>
  expected.every((value, index) => bytes[offset + index] === value);

export const readPngHeader = (
  bytes: Uint8Array
): { readonly width: number; readonly height: number } | null => {
  if (
    bytes.length < HEADER_LENGTH ||
    !matches(bytes, SIGNATURE, 0) ||
    !matches(bytes, IHDR_TYPE, IHDR_TYPE_OFFSET)
  ) {
    return null;
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(WIDTH_OFFSET), height: view.getUint32(HEIGHT_OFFSET) };
};
