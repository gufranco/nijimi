import { componentRow } from './componentRow';
import { Connection } from './connection';
import { isRowLit } from './isRowLit';
import { quadratureFrame } from './quadratureFrame';
import { rgbRow } from './rgbRow';
import { rowPixels } from './rowPixels';
import type { FrameInput, RenderedFrame } from './types';

const RGB_BANDWIDTH_HZ = 5.75e6;

const litRows = (
  input: FrameInput,
  render: (pixels: Float32Array) => Float32Array
): RenderedFrame => ({
  rows: Array.from({ length: input.frame.height }, (_, row) =>
    isRowLit(row, input.frameIndex, input.settings.scan)
      ? render(rowPixels(input.frame, row))
      : null
  )
});

const PATHS: Readonly<Record<Connection, (input: FrameInput) => RenderedFrame>> = {
  [Connection.Rgb]: (input) =>
    litRows(input, (pixels) => rgbRow({ pixels, plan: input.plan, bandwidthHz: RGB_BANDWIDTH_HZ })),
  [Connection.Component]: (input) =>
    litRows(input, (pixels) =>
      componentRow({ pixels, plan: input.plan, saturation: input.settings.saturation })
    ),
  [Connection.SVideo]: quadratureFrame,
  [Connection.Composite]: quadratureFrame,
  [Connection.Rf]: quadratureFrame
};

export const simulateFrame = (input: FrameInput): RenderedFrame =>
  PATHS[input.settings.connection](input);
