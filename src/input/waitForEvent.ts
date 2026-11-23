export const waitForEvent = (input: {
  readonly target: EventTarget;
  readonly name: string;
  readonly timeoutMs: number;
}): Promise<void> =>
  new Promise((resolve, reject) => {
    const finish = (outcome: () => void): void => {
      clearTimeout(timer);
      input.target.removeEventListener(input.name, done);
      input.target.removeEventListener('error', failed);
      outcome();
    };
    const done = (): void => {
      finish(resolve);
    };
    const failed = (): void => {
      finish(() => {
        reject(new Error(`an error event arrived while waiting for ${input.name}`));
      });
    };
    const timer = setTimeout(() => {
      finish(() => {
        reject(new Error(`${input.name} did not arrive within ${String(input.timeoutMs)} ms`));
      });
    }, input.timeoutMs);
    input.target.addEventListener(input.name, done);
    input.target.addEventListener('error', failed);
  });
