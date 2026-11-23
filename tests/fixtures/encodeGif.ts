type Rgb = readonly [number, number, number];

interface GifFrame {
  readonly pixels: readonly number[];
  readonly delayCentiseconds: number;
}

const CLEAR = 4;
const END = 5;
const CODE_BITS = 3;
const MIN_CODE_SIZE = 2;
const PALETTE_SIZE = 4;
const MAX_SUB_BLOCK = 255;
const BYTE_BITS = 8;

const word = (value: number): readonly number[] => [value & 0xff, (value >> BYTE_BITS) & 0xff];

const packCodes = (codes: readonly number[]): readonly number[] => {
  const bits = codes.flatMap((code) =>
    Array.from({ length: CODE_BITS }, (_, bit) => (code >> bit) & 1)
  );
  return Array.from({ length: Math.ceil(bits.length / BYTE_BITS) }, (_, byte) =>
    bits
      .slice(byte * BYTE_BITS, (byte + 1) * BYTE_BITS)
      .reduce((value, bit, index) => value | (bit << index), 0)
  );
};

const subBlocks = (bytes: readonly number[]): readonly number[] => [
  ...Array.from({ length: Math.ceil(bytes.length / MAX_SUB_BLOCK) }, (_, block) => {
    const part = bytes.slice(block * MAX_SUB_BLOCK, (block + 1) * MAX_SUB_BLOCK);
    return [part.length, ...part];
  }).flat(),
  0
];

export const lzwUncompressed = (pixels: readonly number[]): readonly number[] =>
  subBlocks(packCodes([...pixels.flatMap((pixel) => [CLEAR, pixel]), END]));

const frameBytes = (width: number, height: number, frame: GifFrame): readonly number[] => [
  0x21,
  0xf9,
  0x04,
  0x04,
  ...word(frame.delayCentiseconds),
  0x00,
  0x00,
  0x2c,
  ...word(0),
  ...word(0),
  ...word(width),
  ...word(height),
  0x00,
  MIN_CODE_SIZE,
  ...lzwUncompressed(frame.pixels)
];

export const encodeGif = (input: {
  readonly width: number;
  readonly height: number;
  readonly palette: readonly [Rgb, Rgb, Rgb, Rgb];
  readonly frames: readonly GifFrame[];
}): Uint8Array<ArrayBuffer> =>
  Uint8Array.from([
    ...Array.from('GIF89a', (char) => char.charCodeAt(0)),
    ...word(input.width),
    ...word(input.height),
    0x91,
    0x00,
    0x00,
    ...input.palette.slice(0, PALETTE_SIZE).flat(),
    0x21,
    0xff,
    0x0b,
    ...Array.from('NETSCAPE2.0', (char) => char.charCodeAt(0)),
    0x03,
    0x01,
    0x00,
    0x00,
    0x00,
    ...input.frames.flatMap((frame) => frameBytes(input.width, input.height, frame)),
    0x3b
  ]);
