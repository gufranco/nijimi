import { describe, expect, it } from 'vitest';

import { encodeRow } from './encodeRow';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const SPEC = STANDARDS[VideoStandard.Ntsc];
const RATE = 4 * SPEC.subcarrierHz;
const PLAN = { samplesPerCycle: 4, sampleRateHz: RATE, samplesPerPixel: 2, width: 128 };
const CONTEXT = { cycles: 0, lineSwitch: 1, seed: 0, lineSeconds: 0 };

describe('encodeRow', () => {
  it('carries a grey row as luma with no chroma', () => {
    // Arrange
    const pixels = new Float32Array(64 * 3).fill(0.4);

    // Act
    const encoded = encodeRow({ pixels, plan: PLAN, spec: SPEC, context: CONTEXT });

    // Assert
    expect(encoded.luma).toHaveLength(128);
    expect(encoded.luma[64]).toBeCloseTo(0.4, 6);
    expect(Math.max(...Array.from(encoded.chroma, Math.abs))).toBeLessThan(1e-9);
  });

  it('samples a saturated red row on the subcarrier axes, peaking at its V', () => {
    // Arrange
    const pixels = Float32Array.from(Array.from({ length: 64 }, () => [1, 0, 0]).flat());

    // Act
    const encoded = encodeRow({ pixels, plan: PLAN, spec: SPEC, context: CONTEXT });

    // Assert
    const amplitude = Math.max(...Array.from(encoded.chroma.slice(40, 90), Math.abs));
    expect(amplitude).toBeCloseTo(0.61499, 3);
  });
});
