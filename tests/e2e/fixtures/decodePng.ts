import { inflateSync } from 'node:zlib';

export interface DecodedPng {
  readonly width: number;
  readonly height: number;
  readonly pixel: (x: number, y: number) => readonly [number, number, number];
}

interface Chunk {
  readonly type: string;
  readonly data: Buffer;
}

const MAX_CHUNKS = 100_000;

const paeth = (left: number, up: number, upLeft: number): number => {
  const estimate = left + up - upLeft;
  const [a, b, c] = [
    Math.abs(estimate - left),
    Math.abs(estimate - up),
    Math.abs(estimate - upLeft)
  ];
  if (a <= b && a <= c) {
    return left;
  }
  return b <= c ? up : upLeft;
};

const decodeRow = (
  row: Buffer,
  previous: Uint8Array,
  filter: number,
  channels: number
): Uint8Array => {
  let recent: readonly number[] = new Array<number>(channels).fill(0);
  return Uint8Array.from({ length: row.length }, (_, x) => {
    const left = x >= channels ? (recent[0] ?? 0) : 0;
    const up = previous[x] ?? 0;
    const upLeft = x >= channels ? (previous[x - channels] ?? 0) : 0;
    const predictor =
      [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upLeft)][filter] ?? 0;
    const value = ((row[x] ?? 0) + predictor) & 0xff;
    recent = [...recent.slice(1), value];
    return value;
  });
};

const readChunks = (bytes: Buffer): readonly Chunk[] => {
  let offset = 8;
  let chunks: readonly Chunk[] = [];
  for (let count = 0; count < MAX_CHUNKS && offset < bytes.length; count += 1) {
    const length = bytes.readUInt32BE(offset);
    chunks = [
      ...chunks,
      {
        type: bytes.toString('ascii', offset + 4, offset + 8),
        data: bytes.subarray(offset + 8, offset + 8 + length)
      }
    ];
    offset += 12 + length;
  }
  return chunks;
};

export const decodePng = (bytes: Buffer): DecodedPng => {
  const chunks = readChunks(bytes);
  const header = chunks.find((chunk) => chunk.type === 'IHDR')?.data ?? Buffer.alloc(13);
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const channels = header.readUInt8(9) === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(
    Buffer.concat(chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data))
  );
  const rows = Array.from({ length: height }).reduce<readonly Uint8Array[]>((decoded, _, y) => {
    const start = y * (stride + 1);
    const row = decodeRow(
      raw.subarray(start + 1, start + 1 + stride),
      decoded.at(-1) ?? new Uint8Array(stride),
      raw[start] ?? 0,
      channels
    );
    return [...decoded, row];
  }, []);
  return {
    width,
    height,
    pixel: (x, y) => {
      const row = rows[y] ?? new Uint8Array(0);
      return [row[x * channels] ?? 0, row[x * channels + 1] ?? 0, row[x * channels + 2] ?? 0];
    }
  };
};
