import { createMemoryStore } from './createMemoryStore';
import { createOpfsStore } from './createOpfsStore';
import type { ClipDirectory } from './openClipDirectory';
import type { FrameStore } from './types';

export const openFrameStore = (input: {
  readonly clips: ClipDirectory | null;
  readonly name: string;
}): Promise<FrameStore> =>
  input.clips === null
    ? Promise.resolve(createMemoryStore())
    : createOpfsStore({ directory: input.clips.directory, name: input.name });
