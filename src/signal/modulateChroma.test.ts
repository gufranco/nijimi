import { describe, expect, it } from 'vitest';

import { demodulateChroma } from './demodulateChroma';
import { lowpass } from './lowpass';
import { modulateChroma } from './modulateChroma';

const FSC = 315e6 / 88;
const RATE = 4 * FSC;
const LENGTH = 512;

const flat = (value: number): Float64Array => new Float64Array(LENGTH).fill(value);

const centre = (signal: Float64Array): number => signal[LENGTH / 2] ?? Number.NaN;

describe('modulateChroma', () => {
  it('puts +U on the sine and +V on the cosine of the subcarrier', () => {
    // Arrange
    const input = { u: flat(0.3), v: flat(0.2), cycles: 0, samplesPerCycle: 4, lineSwitch: 1 };

    // Act
    const chroma = modulateChroma(input);

    // Assert
    expect(
      Array.from(chroma.slice(0, 4)).map((value) => Math.round(value * 1e9) / 1e9 + 0)
    ).toEqual([0.2, 0.3, -0.2, -0.3]);
  });

  it('inverts V on a PAL switched line', () => {
    // Arrange
    const input = { u: flat(0), v: flat(0.5), cycles: 0, samplesPerCycle: 4, lineSwitch: -1 };

    // Act
    const chroma = modulateChroma(input);

    // Assert
    expect(chroma[0]).toBeCloseTo(-0.5, 12);
  });

  it('round-trips through demodulation and the chroma lowpass', () => {
    // Arrange
    const encoded = modulateChroma({
      u: flat(0.25),
      v: flat(-0.4),
      cycles: 0.37,
      samplesPerCycle: 4,
      lineSwitch: 1
    });

    // Act
    const decoded = demodulateChroma({
      chroma: encoded,
      cycles: 0.37,
      samplesPerCycle: 4,
      hueRadians: 0
    });

    // Assert
    expect(centre(lowpass(decoded.u, 1.3e6, RATE))).toBeCloseTo(0.25, 3);
    expect(centre(lowpass(decoded.v, 1.3e6, RATE))).toBeCloseTo(-0.4, 3);
  });

  it('rotates the decoded colour by the hue error', () => {
    // Arrange
    const encoded = modulateChroma({
      u: flat(0.3),
      v: flat(0),
      cycles: 0,
      samplesPerCycle: 4,
      lineSwitch: 1
    });

    // Act
    const decoded = demodulateChroma({
      chroma: encoded,
      cycles: 0,
      samplesPerCycle: 4,
      hueRadians: Math.PI / 2
    });

    // Assert
    expect(centre(lowpass(decoded.u, 1.3e6, RATE))).toBeCloseTo(0, 3);
    expect(Math.abs(centre(lowpass(decoded.v, 1.3e6, RATE)))).toBeCloseTo(0.3, 3);
  });
});
