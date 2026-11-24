const count = (value: unknown): number => Number(value);

export const hasAudio = (video: HTMLVideoElement): boolean =>
  [
    count(Reflect.get(video, 'webkitAudioDecodedByteCount')),
    count(Reflect.get(video, 'mozHasAudio') === true),
    count(Reflect.get(Object(Reflect.get(video, 'audioTracks')), 'length'))
  ].some((found) => found > 0);
