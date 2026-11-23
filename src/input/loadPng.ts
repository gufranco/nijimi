import type { Logger } from '../logging/createLogger';
import { decodePng } from './decodePng';
import { detectScale } from './detectScale';
import { InputError } from './inputError';
import { readPngHeader } from './readPngHeader';
import { toRgbFrame } from './toRgbFrame';
import { verifyPng } from './verifyPng';
import type { LoadResult, RgbaImage } from './types';

const MAX_FILE_BYTES = 32 * 1024 * 1024;
const MAX_FILE_SIDE = 4096;
const MAX_NATIVE_SIDE = 1024;
const HEADER_BYTES = 24;

const refuse = (error: InputError, width = 0, height = 0): LoadResult => ({
  ok: false,
  error,
  width,
  height
});

const chooseScale = (
  image: RgbaImage,
  override: number
): { readonly scale: number; readonly detected: number } => {
  const detected = detectScale(image);
  const fits = override > 0 && image.width % override === 0 && image.height % override === 0;
  return { scale: fits ? override : detected, detected };
};

const decodeOrNull = async (blob: Blob, logger: Logger): Promise<RgbaImage | null> => {
  const problem = await verifyPng(new Uint8Array(await blob.arrayBuffer()));
  if (problem !== null) {
    logger.error(
      { problem, bytes: blob.size },
      'PNG integrity check failed, refusing the file as corrupt'
    );
    return null;
  }
  try {
    return await decodePng(blob);
  } catch (error: unknown) {
    logger.error(
      { err: error, bytes: blob.size },
      'PNG decode failed, refusing the file as corrupt'
    );
    return null;
  }
};

export const loadPng = async (input: {
  readonly blob: Blob;
  readonly scaleOverride: number;
  readonly logger: Logger;
}): Promise<LoadResult> => {
  if (input.blob.size > MAX_FILE_BYTES) {
    return refuse(InputError.FileTooBig);
  }
  const header = readPngHeader(
    new Uint8Array(await input.blob.slice(0, HEADER_BYTES).arrayBuffer())
  );
  if (header === null) {
    return refuse(InputError.NotPng);
  }
  if (header.width > MAX_FILE_SIDE || header.height > MAX_FILE_SIDE) {
    return refuse(InputError.TooLarge, header.width, header.height);
  }
  const image = await decodeOrNull(input.blob, input.logger);
  if (image === null) {
    return refuse(InputError.Corrupt, header.width, header.height);
  }
  const { scale, detected } = chooseScale(image, input.scaleOverride);
  if (image.width / scale > MAX_NATIVE_SIDE || image.height / scale > MAX_NATIVE_SIDE) {
    return refuse(InputError.TooLarge, image.width / scale, image.height / scale);
  }
  return { ok: true, value: { frame: toRgbFrame(image, scale), scale, detectedScale: detected } };
};
