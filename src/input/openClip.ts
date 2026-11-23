import type { Logger } from '../logging/createLogger';
import { InputError } from './inputError';
import { openImageClip } from './openImageClip';
import { openVideoClip } from './openVideoClip';
import type { ClipSource, InputResult } from './types';

interface OpenClipInput {
  readonly blob: Blob;
  readonly doc: Document;
  readonly logger: Logger;
  readonly Decoder: typeof ImageDecoder | undefined;
}

type Opener = () => Promise<ClipSource>;

const refuse = (error: InputError): InputResult<ClipSource> => ({
  ok: false,
  error,
  width: 0,
  height: 0
});

const pickOpener = async (input: OpenClipInput): Promise<Opener | null> => {
  const type = input.blob.type;
  if (type.startsWith('video/') && input.doc.createElement('video').canPlayType(type) !== '') {
    return () => openVideoClip(input);
  }
  const Decoder = input.Decoder;
  if (Decoder !== undefined && type.startsWith('image/') && (await Decoder.isTypeSupported(type))) {
    return () => openImageClip({ blob: input.blob, Decoder });
  }
  return null;
};

export const openClip = async (input: OpenClipInput): Promise<InputResult<ClipSource>> => {
  const open = await pickOpener(input);
  if (open === null) {
    return refuse(InputError.UnsupportedClip);
  }
  return open().then(
    (decoder): InputResult<ClipSource> => ({ ok: true, value: decoder }),
    (error: unknown) => {
      input.logger.error(
        { err: error, type: input.blob.type, bytes: input.blob.size },
        'clip could not be decoded, refusing the file as corrupt'
      );
      return refuse(InputError.Corrupt);
    }
  );
};
