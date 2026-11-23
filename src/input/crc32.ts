import { sampleAt } from '../signal/sampleAt';

const POLYNOMIAL = 0xedb88320;
const BITS = 8;

const TABLE = Uint32Array.from({ length: 256 }, (_, n) =>
  Array.from({ length: BITS }).reduce<number>(
    (c) => ((c & 1) === 1 ? POLYNOMIAL ^ (c >>> 1) : c >>> 1),
    n
  )
);

export const crc32 = (bytes: Uint8Array): number =>
  (bytes.reduce((crc, byte) => sampleAt(TABLE, (crc ^ byte) & 0xff) ^ (crc >>> BITS), 0xffffffff) ^
    0xffffffff) >>>
  0;
