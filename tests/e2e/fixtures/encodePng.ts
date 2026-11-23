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

export const encodePng = (
  width: number,
  height: number,
  pixel: (x: number, y: number) => readonly [number, number, number]
): Buffer => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(2, 9);
  const rows = Array.from({ length: height }, (_, y) =>
    Buffer.from([0, ...Array.from({ length: width }, (_, x) => pixel(x, y)).flat()])
  );
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
};
