const SILENT_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm'
] as const;

const SOUND_TYPES = [
  'video/mp4;codecs=avc1,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm'
] as const;

interface Recorder {
  readonly isTypeSupported: (type: string) => boolean;
}

export const pickRecordingType = (recorder: Recorder | undefined, audio: boolean): string | null =>
  recorder === undefined
    ? null
    : ((audio ? SOUND_TYPES : SILENT_TYPES).find((type) => recorder.isTypeSupported(type)) ?? null);
