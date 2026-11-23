import { describe, expect, it } from 'vitest';

import { decodeRow } from './decodeRow';
import { modulateChroma } from './modulateChroma';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const SPEC = STANDARDS[VideoStandard.PalBg];
const RATE = 4 * SPEC.subcarrierHz;
const LENGTH = 400;
const flat = (value: number): Float64Array => new Float64Array(LENGTH).fill(value);

describe('decodeRow', () => {
  it('recovers flat Y, U and V and undoes the PAL V switch', () => {
    // Arrange
    const context = { cycles: 0.2, lineSwitch: -1, seed: 1, lineSeconds: 0 };
    const chroma = modulateChroma({
      u: flat(0.1),
      v: flat(0.3),
      cycles: 0.2,
      samplesPerCycle: 4,
      lineSwitch: -1
    });

    // Act
    const row = decodeRow({
      luma: flat(0.6),
      chroma,
      context,
      spec: SPEC,
      sampleRateHz: RATE,
      samplesPerCycle: 4,
      hueRadians: 0,
      lumaBandwidthHz: SPEC.lumaBandwidthHz
    });

    // Assert
    expect(row.y[LENGTH / 2]).toBeCloseTo(0.6, 6);
    expect(row.u[LENGTH / 2]).toBeCloseTo(0.1, 3);
    expect(row.v[LENGTH / 2]).toBeCloseTo(0.3, 3);
  });

  it('band-limits luma to the given bandwidth', () => {
    // Arrange
    const context = { cycles: 0, lineSwitch: 1, seed: 1, lineSeconds: 0 };
    const luma = Float64Array.from({ length: LENGTH }, (_, n) => (n % 2 === 0 ? 1 : 0));

    // Act
    const row = decodeRow({
      luma,
      chroma: flat(0),
      context,
      spec: SPEC,
      sampleRateHz: RATE,
      samplesPerCycle: 4,
      hueRadians: 0,
      lumaBandwidthHz: 3e6
    });

    // Assert
    expect(row.y[LENGTH / 2]).toBeCloseTo(0.5, 2);
  });
});
