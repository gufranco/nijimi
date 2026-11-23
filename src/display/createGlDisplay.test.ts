import { describe, expect, it } from 'vitest';

import { CrtModel } from '../settings/crtModel';
import { MaskKind } from '../settings/maskKind';
import type { DisplaySettings } from '../settings/types';
import { ScanMode } from '../signal/scanMode';
import type { SignalImage } from '../signal/types';
import { createGlDisplay } from './createGlDisplay';
import { DisplayKind } from './displayKind';
import type { Display } from './types';

const PLAIN: DisplaySettings = {
  crt: CrtModel.Custom,
  maskPitch: 1,
  scanlines: 0,
  mask: MaskKind.None,
  maskStrength: 0,
  bloom: 0,
  curvature: 0,
  overscan: false
};

const signal = (
  width: number,
  height: number,
  value: (x: number, y: number) => number
): SignalImage => ({
  width,
  height,
  data: Float32Array.from({ length: width * height * 3 }, (_, index) => {
    const sample = Math.floor(index / 3);
    return value(sample % width, Math.floor(sample / width));
  }),
  sampleAspect: 0.5,
  frameCount: 1
});

interface Rendered {
  readonly display: Display | null;
  readonly width: number;
  readonly height: number;
  readonly pixel: (x: number, y: number) => readonly number[];
}

const render = (
  image: SignalImage,
  settings: Partial<DisplaySettings> = {},
  gamma = 2.4
): Rendered => {
  const canvas = document.createElement('canvas');
  const display = createGlDisplay(canvas);
  const geometry = display?.draw({
    image,
    settings: { ...PLAIN, ...settings },
    gamma,
    scan: ScanMode.Progressive
  });
  const gl = canvas.getContext('webgl2');
  const width = geometry?.width ?? 0;
  const height = geometry?.height ?? 0;
  const bottomUp = new Uint8Array(width * height * 4);
  gl?.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bottomUp);
  const pixel = (x: number, y: number): readonly number[] => {
    const offset = ((height - 1 - y) * width + x) * 4;
    return [bottomUp[offset] ?? 0, bottomUp[offset + 1] ?? 0, bottomUp[offset + 2] ?? 0];
  };
  return { display, width, height, pixel };
};

const toLinear = (byte: number): number => {
  const v = byte / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

const verticalProfile = (frame: Rendered, x: number): readonly number[] =>
  Array.from({ length: frame.height }, (_, y) => toLinear(frame.pixel(x, y)[1] ?? 0));

const widthAboveHalf = (profile: readonly number[]): number => {
  const peak = Math.max(...profile);
  return profile.filter((value) => value >= peak / 2).length;
};

describe('createGlDisplay', () => {
  it('draws with WebGL2 into a canvas sized by the display geometry', () => {
    // Arrange
    const image = signal(64, 8, () => 0.5);

    // Act
    const frame = render(image);

    // Assert
    expect(frame.display?.kind).toBe(DisplayKind.WebGl2);
    expect([frame.width, frame.height]).toEqual([128, 32]);
  });

  it('returns null when the canvas has no WebGL2', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.getContext('2d');

    // Act
    const display = createGlDisplay(canvas);

    // Assert
    expect(display).toBeNull();
  });

  it.each([
    [2.4, 120.6],
    [2.2, 128.5]
  ])('C16 shows a 50 percent signal at gamma %d as sRGB level %d', (gamma, expected) => {
    // Arrange
    const image = signal(64, 8, () => 0.5);

    // Act
    const frame = render(image, {}, gamma);

    // Assert
    const [, green = 0] = frame.pixel(64, 14);
    expect(Math.abs(green - expected)).toBeLessThanOrEqual(4);
  });

  it('C08 opens dark gaps between 240p lines of a mid grey when scanlines are on', () => {
    // Arrange
    const image = signal(64, 8, () => 0.5);

    // Act
    const frame = render(image, { scanlines: 1 });

    // Assert
    const profile = verticalProfile(frame, 64);
    expect((profile[10] ?? 0) / (profile[12] ?? 1)).toBeGreaterThan(1.5);
  });

  it('C17 widens the beam of a bright line over a dim one', () => {
    // Arrange
    const [bright, dim] = [1, 0.3].map((level) => signal(64, 8, (_, y) => (y === 3 ? level : 0)));

    // Act
    const [brightFrame, dimFrame] = [bright, dim].map((image) =>
      render(image ?? signal(1, 1, () => 0), { scanlines: 1 })
    );

    // Assert
    const brightWidth = widthAboveHalf(
      verticalProfile(brightFrame ?? render(signal(1, 1, () => 0)), 64)
    );
    const dimWidth = widthAboveHalf(verticalProfile(dimFrame ?? render(signal(1, 1, () => 0)), 64));
    expect(brightWidth).toBeGreaterThan(dimWidth);
  });

  it('C18 lights an aperture grille in vertical red, green and blue stripes 3 pixels apart', () => {
    // Arrange
    const image = signal(64, 8, () => 1);

    // Act
    const frame = render(image, { mask: MaskKind.ApertureGrille, maskStrength: 1 });

    // Assert
    const dominant = [60, 61, 62, 63, 64, 65].map((x) => {
      const rgb = frame.pixel(x, 14);
      return rgb.indexOf(Math.max(...rgb));
    });
    expect(dominant).toEqual([0, 1, 2, 0, 1, 2]);
    expect(frame.pixel(60, 13)).toEqual(frame.pixel(60, 14));
  });

  it('C18 breaks a slot mask with a dark row every 4 rows, staggered between triads', () => {
    // Arrange
    const image = signal(64, 8, () => 1);

    // Act
    const frame = render(image, { mask: MaskKind.SlotMask, maskStrength: 1 });

    // Assert
    const column = (x: number): readonly boolean[] =>
      Array.from({ length: 8 }, (_, y) => Math.max(...frame.pixel(x, 8 + y)) === 0);
    expect(column(60)).toEqual([false, false, false, true, false, false, false, true]);
    expect(column(63)).toEqual([false, true, false, false, false, true, false, false]);
  });

  it('C18 shifts shadow mask triads every 2 rows', () => {
    // Arrange
    const image = signal(64, 8, () => 1);

    // Act
    const frame = render(image, { mask: MaskKind.ShadowMask, maskStrength: 1 });

    // Assert
    const dominant = (y: number): number => {
      const rgb = frame.pixel(60, y);
      return rgb.indexOf(Math.max(...rgb));
    };
    expect([dominant(8), dominant(9), dominant(10), dominant(11), dominant(12)]).toEqual([
      0, 0, 2, 2, 0
    ]);
  });

  it('C12 hides a bright left border inside the overscan crop', () => {
    // Arrange
    const image = signal(64, 8, (x) => (x < 2 ? 1 : 0));

    // Act
    const [shown, cropped] = [false, true].map((overscan) => render(image, { overscan }));

    // Assert
    expect(Math.max(...(shown?.pixel(0, 14) ?? []))).toBeGreaterThan(100);
    expect(Math.max(...(cropped?.pixel(0, 14) ?? [255]))).toBeLessThan(10);
  });

  it('bends the picture away from the corners with curvature', () => {
    // Arrange
    const image = signal(64, 8, () => 1);

    // Act
    const frame = render(image, { curvature: 1 });

    // Assert
    expect(frame.pixel(0, 0)).toEqual([0, 0, 0]);
    expect(Math.max(...frame.pixel(64, 16))).toBeGreaterThan(200);
  });

  it('adds glow around a bright line with bloom', () => {
    // Arrange
    const image = signal(64, 8, (_, y) => (y === 3 ? 1 : 0));

    // Act
    const [plain, glowing] = [0, 1].map((bloom) => render(image, { bloom, scanlines: 1 }));

    // Assert
    const above = (frame: Rendered | undefined): number => toLinear(frame?.pixel(64, 9)[1] ?? 0);
    expect(above(glowing)).toBeGreaterThan(above(plain));
  });
});
