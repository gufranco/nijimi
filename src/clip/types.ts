export interface FrameReader {
  readonly count: number;
  readonly read: (index: number) => Promise<Uint8Array>;
  readonly discard: () => Promise<void>;
}

export interface FrameStore {
  readonly append: (bytes: Uint8Array | Uint8ClampedArray) => Promise<void>;
  readonly seal: (frameBytes: number) => Promise<FrameReader>;
}

export type OpenFrameStore = () => Promise<FrameStore>;
