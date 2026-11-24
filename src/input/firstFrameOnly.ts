import type { ClipSource } from './types';

export const firstFrameOnly = (source: ClipSource): ClipSource => ({
  lossy: source.lossy,
  each: (visit) =>
    source.each(async (frame, seconds) => {
      await visit(frame, seconds);
      return false;
    }),
  close: () => undefined
});
