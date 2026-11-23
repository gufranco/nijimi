const RECORDING_TYPES = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'] as const;

interface Recorder {
  readonly isTypeSupported: (type: string) => boolean;
}

export const pickRecordingType = (recorder: Recorder | undefined): string | null =>
  recorder === undefined
    ? null
    : (RECORDING_TYPES.find((type) => recorder.isTypeSupported(type)) ?? null);
