import { describe, expect, it } from 'vitest';

import { lowpass } from './lowpass';
import { STANDARDS } from './standards';
import { VideoStandard } from './videoStandard';

const LINE_RATE_525_HZ = 4.5e6 / 286;
const LINE_RATE_625_HZ = 15_625;
const PAL_M_LINE_RATE_HZ = 15_734.264;

describe('STANDARDS', () => {
  it('derives the NTSC subcarrier as 455/2 times the 525-line rate', () => {
    // Arrange
    const expected = (455 / 2) * LINE_RATE_525_HZ;

    // Act
    const actual = STANDARDS[VideoStandard.Ntsc].subcarrierHz;

    // Assert
    expect(actual).toBeCloseTo(expected, 2);
    expect(actual).toBeCloseTo(3_579_545.45, 1);
  });

  it('derives the PAL-B/G subcarrier from the 1135/4 plus 1/625 offset', () => {
    // Arrange
    const expected = (1135 / 4 + 1 / 625) * LINE_RATE_625_HZ;

    // Act
    const actual = STANDARDS[VideoStandard.PalBg].subcarrierHz;

    // Assert
    expect(actual).toBeCloseTo(expected, 2);
  });

  it('derives the PAL-M subcarrier as 909/4 times the nominal PAL-M line rate', () => {
    // Arrange
    const expected = (909 / 4) * PAL_M_LINE_RATE_HZ;

    // Act
    const actual = STANDARDS[VideoStandard.PalM].subcarrierHz;

    // Assert
    expect(actual).toBeCloseTo(expected, 1);
  });

  it('uses the BT.601 square-pixel clocks for 525 and 625 lines', () => {
    // Arrange
    const ntsc = STANDARDS[VideoStandard.Ntsc];
    const palBg = STANDARDS[VideoStandard.PalBg];

    // Act
    const clocks = [
      ntsc.squarePixelHz,
      palBg.squarePixelHz,
      STANDARDS[VideoStandard.PalM].squarePixelHz
    ];

    // Assert
    expect(clocks[0]).toBeCloseTo(12_272_727.27, 1);
    expect(clocks[1]).toBe(14_750_000);
    expect(clocks[2]).toBeCloseTo(12_272_727.27, 1);
  });

  it('alternates the V phase only on the PAL standards', () => {
    // Arrange
    const standards = [VideoStandard.Ntsc, VideoStandard.PalBg, VideoStandard.PalM];

    // Act
    const alternation = standards.map((standard) => STANDARDS[standard].lineAlternation);

    // Assert
    expect(alternation).toEqual([false, true, true]);
  });

  it('band-limits NTSC I to 1.48 MHz and Q to 0.465 MHz on the I and Q axes', () => {
    // Arrange
    const ntsc = STANDARDS[VideoStandard.Ntsc];

    // Act
    const bands = [ntsc.chromaBandwidthHz, ntsc.narrowChromaBandwidthHz, ntsc.iqAxes];

    // Assert
    expect(bands).toEqual([1.48e6, 0.465e6, true]);
  });
});

enum Bound {
  Below = 'below',
  AtLeast = 'at least'
}

interface MaskPoint {
  readonly standard: VideoStandard;
  readonly axis: 'chromaBandwidthHz' | 'narrowChromaBandwidthHz';
  readonly signal: string;
  readonly frequencyHz: number;
  readonly bound: Bound;
  readonly decibels: number;
}

const point = (
  standard: VideoStandard,
  axis: MaskPoint['axis'],
  signal: string,
  frequencyHz: number,
  bound: Bound,
  decibels: number
): MaskPoint => ({ standard, axis, signal, frequencyHz, bound, decibels });

const BT470_ITEM_2_6: readonly MaskPoint[] = [
  point(VideoStandard.Ntsc, 'chromaBandwidthHz', 'I', 1.3e6, Bound.Below, 3),
  point(VideoStandard.Ntsc, 'chromaBandwidthHz', 'I', 3.6e6, Bound.AtLeast, 20),
  point(VideoStandard.Ntsc, 'narrowChromaBandwidthHz', 'Q', 0.4e6, Bound.Below, 2),
  point(VideoStandard.Ntsc, 'narrowChromaBandwidthHz', 'Q', 0.5e6, Bound.Below, 6),
  point(VideoStandard.Ntsc, 'narrowChromaBandwidthHz', 'Q', 0.6e6, Bound.AtLeast, 6),
  point(VideoStandard.PalM, 'chromaBandwidthHz', 'U', 1.3e6, Bound.Below, 2),
  point(VideoStandard.PalM, 'chromaBandwidthHz', 'U', 3.6e6, Bound.AtLeast, 20),
  point(VideoStandard.PalM, 'narrowChromaBandwidthHz', 'V', 1.3e6, Bound.Below, 2),
  point(VideoStandard.PalM, 'narrowChromaBandwidthHz', 'V', 3.6e6, Bound.AtLeast, 20),
  point(VideoStandard.PalBg, 'chromaBandwidthHz', 'U', 1.3e6, Bound.Below, 3),
  point(VideoStandard.PalBg, 'chromaBandwidthHz', 'U', 4e6, Bound.AtLeast, 20),
  point(VideoStandard.PalBg, 'narrowChromaBandwidthHz', 'V', 1.3e6, Bound.Below, 3),
  point(VideoStandard.PalBg, 'narrowChromaBandwidthHz', 'V', 4e6, Bound.AtLeast, 20)
];

const SAMPLES_PER_CYCLE = [4, 8, 16] as const;
const TONE_LENGTH = 8192;

const attenuationDb = (frequencyHz: number, bandwidthHz: number, rateHz: number): number => {
  const tone = Float64Array.from({ length: TONE_LENGTH }, (_, n) =>
    Math.sin((2 * Math.PI * frequencyHz * n) / rateHz)
  );
  const output = lowpass(tone, bandwidthHz, rateHz).slice(TONE_LENGTH / 4, (3 * TONE_LENGTH) / 4);
  const peak = output.reduce((top, value) => Math.max(top, Math.abs(value)), 0);
  return -20 * Math.log10(peak);
};

const MASK_CASES = BT470_ITEM_2_6.flatMap((mask) =>
  SAMPLES_PER_CYCLE.map((perCycle) => ({ ...mask, perCycle }))
);

describe('STANDARDS colour-difference bandwidth', () => {
  it.each(MASK_CASES)(
    'attenuates $standard $signal $bound $decibels dB at $frequencyHz Hz when sampled at $perCycle times the subcarrier',
    ({ standard, axis, frequencyHz, bound, decibels, perCycle }) => {
      // Arrange
      const spec = STANDARDS[standard];
      const rateHz = perCycle * spec.subcarrierHz;

      // Act
      const attenuation = attenuationDb(frequencyHz, spec[axis], rateHz);

      // Assert
      expect(
        bound === Bound.Below ? decibels - attenuation : attenuation - decibels
      ).toBeGreaterThan(bound === Bound.Below ? 0 : -Number.EPSILON);
    }
  );
});
