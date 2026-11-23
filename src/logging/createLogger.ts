export interface Logger {
  readonly error: (context: Readonly<Record<string, unknown>>, message: string) => void;
}

const describe = (value: unknown): unknown =>
  value instanceof Error ? `${value.name}: ${value.message}` : value;

export const createLogger = (report: (error: Error) => void): Logger => ({
  error: (context, message) => {
    const details = Object.fromEntries(
      Object.entries(context).map(([key, value]) => [key, describe(value)])
    );
    const cause = context['err'];
    report(
      new Error(`${message} ${JSON.stringify(details)}`, cause === undefined ? {} : { cause })
    );
  }
});
