import { describe, expect, it } from 'vitest';

import { separateLumaChroma } from './separateLumaChroma';
import { Separation } from './separation';

const FSC = 315e6 / 88;
const RATE = 4 * FSC;
const LENGTH = 256;

const carrier = (phaseCycles: number, amplitude: number, level: number): Float64Array =>
  Float64Array.from(
    { length: LENGTH },
    (_, n) => level + amplitude * Math.sin(2 * Math.PI * (phaseCycles + n / 4))
  );

const peak = (signal: Float64Array): number =>
  signal
    .slice(LENGTH / 4, (3 * LENGTH) / 4)
    .reduce((max, value) => Math.max(max, Math.abs(value)), 0);

const mean = (signal: Float64Array): number =>
  signal.slice(LENGTH / 4, (3 * LENGTH) / 4).reduce((sum, value) => sum + value, 0) / (LENGTH / 2);

const alternating = [carrier(0, 0.2, 0.5), carrier(0.5, 0.2, 0.5), carrier(0, 0.2, 0.5)];
const static3 = [carrier(0, 0.2, 0.5), carrier(0, 0.2, 0.5), carrier(0, 0.2, 0.5)];
const base = { stride: 1, subcarrierHz: FSC, sampleRateHz: RATE };

describe('separateLumaChroma', () => {
  it('notches the subcarrier out of luma and leaves it in chroma', () => {
    // Arrange
    const input = { ...base, rows: alternating, index: 1, separation: Separation.Notch };

    // Act
    const { luma, chroma } = separateLumaChroma(input);

    // Assert
    expect(peak(chroma)).toBeGreaterThan(0.19);
    expect(mean(luma)).toBeCloseTo(0.5, 2);
    expect(peak(luma.map((value) => value - 0.5))).toBeLessThan(0.01);
  });

  it('cancels chroma that flips phase between lines with a 1-line comb', () => {
    // Arrange
    const input = { ...base, rows: alternating, index: 1, separation: Separation.Comb1 };

    // Act
    const { chroma } = separateLumaChroma(input);

    // Assert
    expect(peak(chroma)).toBeCloseTo(0.2, 2);
  });

  it('leaks everything into luma when the lines keep the same phase', () => {
    // Arrange
    const input = { ...base, rows: static3, index: 1, separation: Separation.Comb2 };

    // Act
    const { luma, chroma } = separateLumaChroma(input);

    // Assert
    expect(peak(chroma)).toBeLessThan(0.01);
    expect(peak(luma.map((value) => value - 0.5))).toBeGreaterThan(0.19);
  });

  it('falls back to the notch on an edge row with no neighbour', () => {
    // Arrange
    const comb = { ...base, rows: static3, index: 0, separation: Separation.Comb2 };
    const trap = { ...base, rows: static3, index: 0, separation: Separation.Notch };

    // Act
    const combed = separateLumaChroma(comb);

    // Assert
    expect(Array.from(combed.chroma)).toEqual(Array.from(separateLumaChroma(trap).chroma));
  });

  it('returns empty planes for a row index outside the frame', () => {
    // Arrange
    const input = { ...base, rows: static3, index: 7, separation: Separation.Notch };

    // Act
    const { luma, chroma } = separateLumaChroma(input);

    // Assert
    expect(luma).toHaveLength(0);
    expect(chroma).toHaveLength(0);
  });

  it('uses the row two lines up and down with a stride of two', () => {
    // Arrange
    const rows = [carrier(0, 0.2, 0.5), carrier(0.25, 0.2, 0.5), carrier(0.5, 0.2, 0.5)];
    const input = {
      ...base,
      stride: 2,
      rows: [...rows, carrier(0, 0.2, 0.5)],
      index: 2,
      separation: Separation.Comb1
    };

    // Act
    const { chroma } = separateLumaChroma(input);

    // Assert
    expect(peak(chroma)).toBeCloseTo(0.2, 2);
  });
});
