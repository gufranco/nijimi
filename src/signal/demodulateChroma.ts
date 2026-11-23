const TWO_PI = 2 * Math.PI;

export const demodulateChroma = (input: {
  readonly chroma: Float64Array;
  readonly cycles: number;
  readonly samplesPerCycle: number;
  readonly hueRadians: number;
}): { readonly u: Float64Array; readonly v: Float64Array } => {
  const theta = (n: number): number =>
    TWO_PI * (input.cycles + n / input.samplesPerCycle) + input.hueRadians;
  return {
    u: input.chroma.map((c, n) => 2 * c * Math.sin(theta(n))),
    v: input.chroma.map((c, n) => 2 * c * Math.cos(theta(n)))
  };
};
