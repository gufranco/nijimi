import type { Logger } from '../logging/createLogger';

const PARENT = 'nijimi-clips';
const PROBE = 'probe';

const usable = async (
  storage: StorageManager,
  id: string
): Promise<{
  readonly parent: FileSystemDirectoryHandle;
  readonly own: FileSystemDirectoryHandle;
}> => {
  const root = await storage.getDirectory();
  const parent = await root.getDirectoryHandle(PARENT, { create: true });
  const own = await parent.getDirectoryHandle(id, { create: true });
  await own.getFileHandle(PROBE, { create: true });
  await own.removeEntry(PROBE);
  return { parent, own };
};

const sweep = async (parent: FileSystemDirectoryHandle, keep: string): Promise<void> => {
  const names = await Array.fromAsync(parent.keys());
  await Promise.all(
    names
      .filter((name) => name !== keep)
      .map((name) => parent.removeEntry(name, { recursive: true }))
  );
};

const storageRefused = (): null => null;

export interface ClipDirectory {
  readonly directory: FileSystemDirectoryHandle;
  readonly remove: () => Promise<void>;
}

export const openClipDirectory = async (input: {
  readonly storage: StorageManager;
  readonly locks: LockManager;
  readonly id: string;
  readonly held: Promise<void>;
  readonly logger: Logger;
  readonly page: EventTarget;
}): Promise<ClipDirectory | null> => {
  const opened = await usable(input.storage, input.id).catch(storageRefused);
  if (opened === null) {
    return null;
  }
  await input.locks.request(PARENT, { mode: 'exclusive', ifAvailable: true }, async (lock) => {
    if (lock !== null) {
      await sweep(opened.parent, input.id);
    }
  });
  void input.locks
    .request(PARENT, { mode: 'shared' }, () => input.held)
    .catch((error: unknown) => {
      input.logger.error({ err: error }, 'holding the clip storage lock failed');
    });
  const remove = (): Promise<void> => opened.parent.removeEntry(input.id, { recursive: true });
  input.page.addEventListener('pagehide', () => {
    remove().catch((error: unknown) => {
      input.logger.error({ err: error }, 'removing the clip storage on page hide failed');
    });
  });
  return { directory: opened.own, remove };
};
