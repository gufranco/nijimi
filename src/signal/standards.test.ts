import { describe, expect, it } from 'vitest';

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

  it('band-limits chroma to 1.3 MHz and NTSC Q to 0.5 MHz', () => {
    // Arrange
    const ntsc = STANDARDS[VideoStandard.Ntsc];

    // Act
    const bands = [ntsc.chromaBandwidthHz, ntsc.narrowChromaBandwidthHz, ntsc.iqAxes];

    // Assert
    expect(bands).toEqual([1.3e6, 0.5e6, true]);
  });
});
