import { describe, expect, it } from 'vitest';

import { rfChannel } from './rfChannel';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const SPEC = STANDARDS[VideoStandard.Ntsc];
const RATE = 4 * SPEC.subcarrierHz;
const CONTEXT = { cycles: 0, lineSwitch: 1, seed: 77, lineSeconds: 0 };
const QUIET = { noise: 0, ghost: 0, beat: 0 };
const LENGTH = 2048;

const impulse = (): Float64Array =>
  Float64Array.from({ length: LENGTH }, (_, n) => (n === 100 ? 1 : 0));

describe('rfChannel', () => {
  it('passes the signal unchanged at zero strength', () => {
    // Arrange
    const composite = Float64Array.from({ length: LENGTH }, (_, n) => Math.sin(n / 3));

    // Act
    const output = rfChannel({
      composite,
      rf: QUIET,
      context: CONTEXT,
      spec: SPEC,
      sampleRateHz: RATE
    });

    // Assert
    expect(Array.from(output)).toEqual(Array.from(composite));
  });

  it('adds a ghost 1.5 microseconds late at 35 percent of full strength', () => {
    // Arrange
    const rf = { ...QUIET, ghost: 1 };
    const delay = Math.round(1.5e-6 * RATE);

    // Act
    const output = rfChannel({
      composite: impulse(),
      rf,
      context: CONTEXT,
      spec: SPEC,
      sampleRateHz: RATE
    });

    // Assert
    expect(output[100]).toBe(1);
    expect(output[100 + delay]).toBeCloseTo(0.35, 12);
    expect(output[99 + delay]).toBe(0);
  });

  it('adds the 920 kHz NTSC sound beat', () => {
    // Arrange
    const rf = { ...QUIET, beat: 1 };
    const beatHz = 4.5e6 - SPEC.subcarrierHz;
    const quarterPeriod = Math.round(RATE / beatHz / 4);

    // Act
    const output = rfChannel({
      composite: new Float64Array(LENGTH),
      rf,
      context: CONTEXT,
      spec: SPEC,
      sampleRateHz: RATE
    });

    // Assert
    expect(beatHz).toBeCloseTo(920_454.5, 0);
    expect(output[0]).toBeCloseTo(0, 12);
    expect(output[quarterPeriod]).toBeGreaterThan(0.055);
  });

  it('adds seeded noise with the configured spread', () => {
    // Arrange
    const rf = { ...QUIET, noise: 0.5 };

    // Act
    const output = rfChannel({
      composite: new Float64Array(LENGTH),
      rf,
      context: CONTEXT,
      spec: SPEC,
      sampleRateHz: RATE
    });

    // Assert
    const spread = Math.sqrt(output.reduce((sum, value) => sum + value * value, 0) / LENGTH);
    expect(spread).toBeGreaterThan(0.045);
    expect(spread).toBeLessThan(0.055);
  });
});
