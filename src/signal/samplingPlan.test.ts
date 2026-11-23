import { describe, expect, it } from 'vitest';

import { samplingPlan } from './samplingPlan';

const FSC = 315e6 / 88;

describe('samplingPlan', () => {
  it('samples a 5.37 MHz dot clock at four times the subcarrier', () => {
    // Arrange
    const input = { dotClockHz: 21_477_272.7 / 4, subcarrierHz: FSC, pixels: 256 };

    // Act
    const plan = samplingPlan(input);

    // Assert
    expect(plan.samplesPerCycle).toBe(4);
    expect(plan.sampleRateHz).toBeCloseTo(14_318_181.8, 0);
    expect(plan.samplesPerPixel).toBeCloseTo(8 / 3, 5);
    expect(plan.width).toBe(683);
  });

  it('doubles the rate so a 10.7 MHz dot clock keeps two samples per pixel', () => {
    // Arrange
    const input = { dotClockHz: 21_477_272.7 / 2, subcarrierHz: FSC, pixels: 512 };

    // Act
    const plan = samplingPlan(input);

    // Assert
    expect(plan.samplesPerCycle).toBe(8);
    expect(plan.samplesPerPixel).toBeCloseTo(8 / 3, 5);
  });

  it('never exceeds sixteen samples per cycle', () => {
    // Arrange
    const input = { dotClockHz: 100e6, subcarrierHz: FSC, pixels: 10 };

    // Act
    const plan = samplingPlan(input);

    // Assert
    expect(plan.samplesPerCycle).toBe(16);
  });
});
