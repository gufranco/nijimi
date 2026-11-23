import { describe, expect, it } from 'vitest';

import { CrtModel } from '../settings/crtModel';
import { MaskKind } from '../settings/maskKind';
import { ScanMode } from '../signal/scanMode';
import { create2dDisplay } from './create2dDisplay';
import { DisplayKind } from './displayKind';
import type { Display } from './types';

const SETTINGS = {
  crt: CrtModel.Custom,
  maskPitch: 1,
  scanlines: 1,
  mask: MaskKind.ApertureGrille,
  maskStrength: 1,
  bloom: 1,
  curvature: 1,
  overscan: false
};

describe('create2dDisplay', () => {
  it('scales the signal into the display geometry without CRT optics', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    const display = create2dDisplay(canvas);
    const image = {
      width: 8,
      height: 2,
      data: new Float32Array(48).fill(0.5),
      sampleAspect: 0.5,
      frameCount: 1
    };

    // Act
    const geometry = display.draw({
      image,
      settings: SETTINGS,
      gamma: 2.4,
      scan: ScanMode.Progressive
    });

    // Assert
    const pixel = canvas
      .getContext('2d')
      ?.getImageData(geometry.width / 2, geometry.height / 2, 1, 1).data;
    expect(display.kind).toBe(DisplayKind.Canvas2d);
    expect([canvas.width, canvas.height]).toEqual([16, 8]);
    expect(Array.from(pixel ?? [])).toEqual([128, 128, 128, 255]);
  });

  it('crops the overscan border', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    const display = create2dDisplay(canvas);
    const data = Float32Array.from({ length: 40 * 2 * 3 }, (_, index) =>
      Math.floor(index / 3) % 40 === 0 ? 1 : 0
    );
    const image = { width: 40, height: 2, data, sampleAspect: 1, frameCount: 1 };

    // Act
    display.draw({
      image,
      settings: { ...SETTINGS, overscan: true },
      gamma: 2.4,
      scan: ScanMode.Progressive
    });

    // Assert
    const left = canvas.getContext('2d')?.getImageData(0, 4, 1, 1).data;
    expect(left?.[0]).toBeLessThan(40);
  });

  it('throws when the canvas already holds another context', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    canvas.getContext('webgl2');

    // Act
    const create = (): Display => create2dDisplay(canvas);

    // Assert
    expect(create).toThrow('2D canvas context is unavailable');
  });
});
