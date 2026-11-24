export interface Clock {
  readonly time: () => number;
  readonly playing: () => boolean;
  readonly play: () => Promise<void>;
  readonly pause: () => void;
  readonly seek: (seconds: number) => void;
}

export interface ClipAudio extends Clock {
  readonly stream: () => MediaStream;
  readonly close: () => Promise<void>;
}
