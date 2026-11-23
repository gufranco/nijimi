import { createAppendLog } from './createAppendLog';
import type { FrameStore } from './types';

const EMPTY = new Uint8Array(0);

export const createMemoryStore = (): FrameStore => {
  const log = createAppendLog<Uint8Array>();
  return {
    append: (bytes) => {
      log.append(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
      return Promise.resolve();
    },
    seal: () => {
      const frames = log.items();
      return Promise.resolve({
        count: frames.length,
        read: (index) => Promise.resolve(frames[index] ?? EMPTY),
        discard: () => Promise.resolve()
      });
    }
  };
};
