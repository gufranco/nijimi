const RECORDING_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm'
] as const;

interface Recorder {
  readonly isTypeSupported: (type: string) => boolean;
}

export const pickRecordingType = (recorder: Recorder | undefined): string | null =>
  recorder === undefined
    ? null
    : (RECORDING_TYPES.find((type) => recorder.isTypeSupported(type)) ?? null);
