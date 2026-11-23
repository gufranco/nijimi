const CHUNK = 1024;

export interface AppendLog<T> {
  readonly append: (item: T) => void;
  readonly items: () => readonly T[];
}

export const createAppendLog = <T>(): AppendLog<T> => {
  let sealed: readonly (readonly T[])[] = [];
  let current: readonly T[] = [];
  return {
    append: (item) => {
      current = [...current, item];
      if (current.length === CHUNK) {
        sealed = [...sealed, current];
        current = [];
      }
    },
    items: () => [...sealed.flat(), ...current]
  };
};
