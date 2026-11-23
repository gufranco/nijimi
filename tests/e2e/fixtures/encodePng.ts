import { deflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = Array.from({ length: 256 }, (_, n) =>
  Array.from({ length: 8 }).reduce<number>((c) => (c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1), n)
);

const crc32 = (bytes: Buffer): number =>
  (bytes.reduce((crc, byte) => (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8), 0xffffffff) ^
    0xffffffff) >>>
  0;

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

export const corruptPng = (width: number, height: number): Buffer => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(2, 9);
  const garbage = Buffer.from(Array.from({ length: 64 }, (_, index) => (index * 97 + 13) % 256));
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', garbage),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

type Pixel = (x: number, y: number) => readonly [number, number, number];

const rgbHeader = (width: number, height: number): Buffer => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(2, 9);
  return header;
};

const imageData = (width: number, height: number, pixel: Pixel): Buffer =>
  deflateSync(
    Buffer.concat(
      Array.from({ length: height }, (_, y) =>
        Buffer.from([0, ...Array.from({ length: width }, (_, x) => pixel(x, y)).flat()])
      )
    )
  );

const u32 = (...values: readonly number[]): Buffer => {
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => bytes.writeUInt32BE(value, index * 4));
  return bytes;
};

export const encodePng = (width: number, height: number, pixel: Pixel): Buffer =>
  Buffer.concat([
    SIGNATURE,
    chunk('IHDR', rgbHeader(width, height)),
    chunk('IDAT', imageData(width, height, pixel)),
    chunk('IEND', Buffer.alloc(0))
  ]);

const frameControl = (sequence: number, width: number, height: number, delayMs: number): Buffer => {
  const timing = Buffer.alloc(6);
  timing.writeUInt16BE(delayMs, 0);
  timing.writeUInt16BE(1000, 2);
  return chunk('fcTL', Buffer.concat([u32(sequence, width, height, 0, 0), timing]));
};

export const encodeApng = (
  width: number,
  height: number,
  frames: readonly { readonly pixel: Pixel; readonly delayMs: number }[]
): Buffer =>
  Buffer.concat([
    SIGNATURE,
    chunk('IHDR', rgbHeader(width, height)),
    chunk('acTL', u32(frames.length, 0)),
    ...frames.flatMap((frame, index) => {
      const data = imageData(width, height, frame.pixel);
      const sequence = index === 0 ? 0 : index * 2 - 1;
      const control = frameControl(sequence, width, height, frame.delayMs);
      return index === 0
        ? [control, chunk('IDAT', data)]
        : [control, chunk('fdAT', Buffer.concat([u32(sequence + 1), data]))];
    }),
    chunk('IEND', Buffer.alloc(0))
  ]);
