import type { Logger } from '../logging/createLogger';
import { colorStats } from '../signal/colorStats';
import { chooseScale } from './chooseScale';
import { decodePng } from './decodePng';
import { InputError } from './inputError';
import { INPUT_LIMITS } from './inputLimits';
import { readPngHeader } from './readPngHeader';
import { toRgbFrame } from './toRgbFrame';
import { verifyPng } from './verifyPng';
import type { LoadResult, RgbaImage } from './types';

const HEADER_BYTES = 24;

const refuse = (error: InputError, width = 0, height = 0): LoadResult => ({
  ok: false,
  error,
  width,
  height
});

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
  if (input.blob.size > INPUT_LIMITS.maxFileBytes) {
    return refuse(InputError.FileTooBig);
  }
  const header = readPngHeader(
    new Uint8Array(await input.blob.slice(0, HEADER_BYTES).arrayBuffer())
  );
  if (header === null) {
    return refuse(InputError.NotPng);
  }
  if (header.width > INPUT_LIMITS.maxFileSide || header.height > INPUT_LIMITS.maxFileSide) {
    return refuse(InputError.TooLarge, header.width, header.height);
  }
  const image = await decodeOrNull(input.blob, input.logger);
  if (image === null) {
    return refuse(InputError.Corrupt, header.width, header.height);
  }
  const { scale, detected } = chooseScale(image, input.scaleOverride);
  if (
    image.width / scale > INPUT_LIMITS.maxNativeSide ||
    image.height / scale > INPUT_LIMITS.maxNativeSide
  ) {
    return refuse(InputError.TooLarge, image.width / scale, image.height / scale);
  }
  const frame = toRgbFrame(image, scale);
  return {
    ok: true,
    value: { frame, scale, detectedScale: detected, stats: colorStats(frame), presence: null }
  };
};
