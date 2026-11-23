export const required = <T>(value: T | null, what: string): T => {
  if (value === null) {
    throw new Error(`${what} is unavailable`);
  }
  return value;
};
