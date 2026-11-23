import { toError } from '../logging/toError';
import { crc32 } from './crc32';

const SIGNATURE_LENGTH = 8;
const LENGTH_BYTES = 4;
const TYPE_BYTES = 4;
const CRC_BYTES = 4;
const MAX_CHUNKS = 65_536;

interface Chunk {
  readonly type: string;
  readonly payload: Uint8Array;
  readonly next: number;
}

const readChunk = (bytes: Uint8Array, view: DataView, offset: number): Chunk | string => {
  const length = view.getUint32(offset);
  const next = offset + LENGTH_BYTES + TYPE_BYTES + length + CRC_BYTES;
  if (next > bytes.length) {
    return `chunk at byte ${String(offset)} runs past the end of the file`;
  }
  const body = bytes.subarray(offset + LENGTH_BYTES, next - CRC_BYTES);
  if (crc32(body) !== view.getUint32(next - CRC_BYTES)) {
    return `chunk at byte ${String(offset)} fails its CRC`;
  }
  return {
    type: String.fromCharCode(...body.subarray(0, TYPE_BYTES)),
    payload: body.subarray(TYPE_BYTES),
    next
  };
};

const imageParts = (bytes: Uint8Array): readonly Uint8Array[] | string => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = SIGNATURE_LENGTH;
  let collected: readonly Uint8Array[] = [];
  for (let count = 0; count < MAX_CHUNKS && offset + LENGTH_BYTES <= bytes.length; count += 1) {
    const chunk = readChunk(bytes, view, offset);
    if (typeof chunk === 'string') {
      return chunk;
    }
    if (chunk.type === 'IEND') {
      return collected.length === 0 ? 'the file holds no image data' : collected;
    }
    collected = chunk.type === 'IDAT' ? [...collected, chunk.payload] : collected;
    offset = chunk.next;
  }
  return 'the file ends before IEND';
};

export const verifyPng = async (bytes: Uint8Array): Promise<string | null> => {
  const parts = imageParts(bytes);
  if (typeof parts === 'string') {
    return parts;
  }
  try {
    const stream = new Blob(parts.map((part) => part.slice()))
      .stream()
      .pipeThrough(new DecompressionStream('deflate'));
    await new Response(stream).arrayBuffer();
    return null;
  } catch (error: unknown) {
    return `image data does not inflate: ${toError(error).message}`;
  }
};
