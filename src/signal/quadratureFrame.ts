import { Connection } from './connection';
import { decodeRow } from './decodeRow';
import { encodeRow } from './encodeRow';
import { isRowLit } from './isRowLit';
import { PalDecoding } from './palDecoding';
import { palDelayLine } from './palDelayLine';
import { rfChannel } from './rfChannel';
import { rowContext } from './rowContext';
import { rowPixels } from './rowPixels';
import { sampleAt } from './sampleAt';
import { ScanMode } from './scanMode';
import { separateLumaChroma } from './separateLumaChroma';
import type { FrameInput, RenderedFrame, RowContext, YuvRow } from './types';
import { yuvRowToRgb } from './yuvRowToRgb';

const RF_LUMA_BANDWIDTH_HZ = 3.0e6;
const DEGREES_TO_RADIANS = Math.PI / 180;

interface Encoded {
  readonly context: RowContext;
  readonly luma: Float64Array;
  readonly chroma: Float64Array;
}

const strideOf = (input: FrameInput): number =>
  input.settings.scan === ScanMode.Interlaced ? 2 : 1;

const encodeLitRows = (input: FrameInput): readonly (Encoded | null)[] =>
  Array.from({ length: input.frame.height }, (_, row) => {
    if (!isRowLit(row, input.frameIndex, input.settings.scan)) {
      return null;
    }
    const context = rowContext({ ...input, ...input.settings, row, seed: input.settings.seed });
    return {
      context,
      ...encodeRow({
        pixels: rowPixels(input.frame, row),
        plan: input.plan,
        spec: input.spec,
        context
      })
    };
  });

const lineSignal = (input: FrameInput, encoded: Encoded | null): Float64Array => {
  if (encoded === null) {
    return new Float64Array(0);
  }
  const composite = encoded.luma.map((value, n) => value + sampleAt(encoded.chroma, n));
  if (input.settings.connection !== Connection.Rf) {
    return composite;
  }
  return rfChannel({
    composite,
    rf: input.settings.rf,
    context: encoded.context,
    spec: input.spec,
    sampleRateHz: input.plan.sampleRateHz
  });
};

const lumaBandwidth = (input: FrameInput): number =>
  input.settings.connection === Connection.Rf
    ? Math.min(RF_LUMA_BANDWIDTH_HZ, input.spec.lumaBandwidthHz)
    : input.spec.lumaBandwidthHz;

const decodeLitRows = (
  input: FrameInput,
  encoded: readonly (Encoded | null)[]
): readonly (YuvRow | null)[] => {
  const lines = encoded.map((row) => lineSignal(input, row));
  return encoded.map((row, index) => {
    if (row === null) {
      return null;
    }
    const separated =
      input.settings.connection === Connection.SVideo
        ? row
        : separateLumaChroma({
            rows: lines,
            index,
            stride: strideOf(input),
            separation: input.settings.separation,
            subcarrierHz: input.spec.subcarrierHz,
            sampleRateHz: input.plan.sampleRateHz
          });
    return decodeRow({
      ...separated,
      context: row.context,
      spec: input.spec,
      sampleRateHz: input.plan.sampleRateHz,
      samplesPerCycle: input.plan.samplesPerCycle,
      hueRadians: input.settings.hueDegrees * DEGREES_TO_RADIANS,
      lumaBandwidthHz: lumaBandwidth(input)
    });
  });
};

const correctPal = (
  input: FrameInput,
  decoded: readonly (YuvRow | null)[]
): readonly (YuvRow | null)[] => {
  const useDelayLine =
    input.spec.lineAlternation && input.settings.palDecoding === PalDecoding.DelayLine;
  return decoded.map((row, index) =>
    row !== null && useDelayLine ? palDelayLine(row, decoded[index - strideOf(input)] ?? null) : row
  );
};

export const quadratureFrame = (input: FrameInput): RenderedFrame => {
  const decoded = correctPal(input, decodeLitRows(input, encodeLitRows(input)));
  return {
    rows: decoded.map((row) => (row === null ? null : yuvRowToRgb(row, input.settings.saturation)))
  };
};
