import { describe, expect, it } from 'vitest';

import { bandlimitChroma } from './bandlimitChroma';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const FSC = 315e6 / 88;
const RATE = 4 * FSC;
const LENGTH = 1024;
const IQ_SIN = Math.sin((33 * Math.PI) / 180);
const IQ_COS = Math.cos((33 * Math.PI) / 180);

const rotateIq = (a: number, b: number): readonly [number, number] => [
  -IQ_SIN * a + IQ_COS * b,
  IQ_COS * a + IQ_SIN * b
];

const tone = (frequencyHz: number, amplitude: number): Float64Array =>
  Float64Array.from(
    { length: LENGTH },
    (_, n) => amplitude * Math.sin((2 * Math.PI * frequencyHz * n) / RATE)
  );

const peak = (signal: Float64Array): number =>
  signal
    .slice(LENGTH / 4, (3 * LENGTH) / 4)
    .reduce((max, value) => Math.max(max, Math.abs(value)), 0);

describe('bandlimitChroma', () => {
  it('keeps a 1 MHz NTSC I component and drops the same tone on Q', () => {
    // Arrange
    const i = tone(1e6, 0.2);
    const q = new Float64Array(LENGTH);
    const u = Float64Array.from(i, (value, n) => rotateIq(value, q[n] ?? 0)[0]);
    const v = Float64Array.from(i, (value, n) => rotateIq(value, q[n] ?? 0)[1]);

    // Act
    const limited = bandlimitChroma({
      u,
      v,
      spec: STANDARDS[VideoStandard.Ntsc],
      sampleRateHz: RATE
    });

    // Assert
    const iOut = Float64Array.from(limited.u, (value, n) => rotateIq(value, limited.v[n] ?? 0)[0]);
    expect(peak(iOut)).toBeGreaterThan(0.2 * 0.8);
  });

  it('cuts a 1 MHz tone on NTSC Q to under a fifth', () => {
    // Arrange
    const q = tone(1e6, 0.2);
    const u = Float64Array.from(q, (value) => rotateIq(0, value)[0]);
    const v = Float64Array.from(q, (value) => rotateIq(0, value)[1]);

    // Act
    const limited = bandlimitChroma({
      u,
      v,
      spec: STANDARDS[VideoStandard.Ntsc],
      sampleRateHz: RATE
    });

    // Assert
    const qOut = Float64Array.from(limited.u, (value, n) => rotateIq(value, limited.v[n] ?? 0)[1]);
    expect(peak(qOut)).toBeLessThan(0.2 / 5);
  });

  it('filters PAL U and V with the same 1.56 MHz bandwidth', () => {
    // Arrange
    const u = tone(1.56e6, 0.3);
    const v = tone(1.56e6, 0.3);

    // Act
    const limited = bandlimitChroma({
      u,
      v,
      spec: STANDARDS[VideoStandard.PalBg],
      sampleRateHz: RATE
    });

    // Assert
    expect(peak(limited.u)).toBeCloseTo(peak(limited.v), 9);
    expect(peak(limited.u)).toBeCloseTo(0.3 * Math.SQRT1_2, 1);
  });
});
