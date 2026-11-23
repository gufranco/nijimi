import type { RgbFrame, SignalImage } from '../../src/signal/types';

const KR = 0.299;
const KG = 0.587;
const KB = 0.114;
const U_SCALE = 0.492111;
const V_SCALE = 0.877283;

const at = (data: Float32Array, index: number): number => data[index] ?? Number.NaN;

const luma = (data: Float32Array, pixel: number): number =>
  KR * at(data, pixel * 3) + KG * at(data, pixel * 3 + 1) + KB * at(data, pixel * 3 + 2);

const chroma = (data: Float32Array, pixel: number): readonly [number, number] => {
  const y = luma(data, pixel);
  return [U_SCALE * (at(data, pixel * 3 + 2) - y), V_SCALE * (at(data, pixel * 3) - y)];
};

const centreColumns = (width: number): readonly number[] =>
  Array.from({ length: Math.floor(width / 2) }, (_, index) => Math.floor(width / 4) + index);

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

const crossing = (values: readonly number[], level: number, rising: boolean): number => {
  const index = values.findIndex((value) => (rising ? value >= level : value <= level));
  const before = values[index - 1] ?? level;
  const after = values[index] ?? level;
  return index - 1 + (level - before) / (after - before || 1);
};

export const MEASURE = {
  luma,
  chroma,
  meanFrameLuma: (frame: RgbFrame): number => {
    const columns = centreColumns(frame.width);
    return mean(
      Array.from({ length: frame.height }, (_, row) =>
        columns.map((x) => luma(frame.data, row * frame.width + x))
      ).flat()
    );
  },
  meanImageLuma: (image: SignalImage): number => {
    const columns = centreColumns(image.width);
    return mean(
      Array.from({ length: image.height }, (_, row) =>
        columns.map((x) => luma(image.data, row * image.width + x))
      ).flat()
    );
  },
  rowLuma: (image: SignalImage, row: number): readonly number[] =>
    Array.from({ length: image.width }, (_, x) => luma(image.data, row * image.width + x)),
  rowRedDifference: (image: SignalImage, row: number): readonly number[] =>
    Array.from(
      { length: image.width },
      (_, x) =>
        at(image.data, (row * image.width + x) * 3) - luma(image.data, row * image.width + x)
    ),
  centreContrast: (trace: readonly number[]): number => {
    const centre = centreColumns(trace.length).map((x) => trace[x] ?? Number.NaN);
    return Math.max(...centre) - Math.min(...centre);
  },
  meanChromaMagnitude: (image: SignalImage, row: number): number =>
    mean(
      centreColumns(image.width).map((x) =>
        Math.hypot(...chroma(image.data, row * image.width + x))
      )
    ),
  hueDegrees: (image: SignalImage, row: number): number => {
    const [u, v] = chroma(image.data, row * image.width + Math.floor(image.width / 2));
    return (Math.atan2(v, u) * 180) / Math.PI;
  },
  riseSeconds: (trace: readonly number[], sampleRateHz: number): number => {
    const start = trace[0] ?? 0;
    const end = trace.at(-1) ?? 0;
    const rising = end > start;
    const low = crossing(trace, start + 0.1 * (end - start), rising);
    const high = crossing(trace, start + 0.9 * (end - start), rising);
    return (high - low) / sampleRateHz;
  },
  allFinite: (image: SignalImage): boolean =>
    image.data.every((value) => Number.isFinite(value) && value > -0.6 && value < 1.6)
};
