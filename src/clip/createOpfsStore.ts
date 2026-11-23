import type { FrameStore } from './types';

export const createOpfsStore = async (input: {
  readonly directory: FileSystemDirectoryHandle;
  readonly name: string;
}): Promise<FrameStore> => {
  const handle = await input.directory.getFileHandle(input.name, { create: true });
  const writable = await handle.createWritable();
  return {
    append: (bytes) => writable.write(new Uint8Array(bytes)),
    seal: async (frameBytes) => {
      await writable.close();
      const file = await handle.getFile();
      return {
        count: Math.floor(file.size / frameBytes),
        read: async (index) =>
          new Uint8Array(
            await file.slice(index * frameBytes, (index + 1) * frameBytes).arrayBuffer()
          ),
        discard: () => input.directory.removeEntry(input.name)
      };
    }
  };
};
