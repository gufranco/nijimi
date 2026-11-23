import { describe, expect, it } from 'vitest';

import { ScanMode } from '../signal/scanMode';
import { displayGeometry } from './displayGeometry';
import type { SignalImage } from '../signal/types';

const image = (width: number, height: number, sampleAspect: number): SignalImage => ({
  width,
  height,
  data: new Float32Array(width * height * 3),
  sampleAspect,
  frameCount: 1
});

describe('displayGeometry', () => {
  it('draws 4 output rows per 240p line at the picture aspect ratio', () => {
    // Arrange
    const signal = image(683, 224, 12_272_727 / (4 * (315e6 / 88)) / 2);

    // Act
    const geometry = displayGeometry({
      image: signal,
      scan: ScanMode.Progressive,
      overscan: false
    });

    // Assert
    expect(geometry.height).toBe(896);
    expect(geometry.width / geometry.height).toBeCloseTo((256 * (8 / 7)) / 224, 2);
    expect(geometry.crop).toBe(0);
  });

  it('draws 2 output rows per 480i line', () => {
    // Arrange
    const signal = image(683, 448, 12_272_727 / (4 * (315e6 / 88)));

    // Act
    const geometry = displayGeometry({ image: signal, scan: ScanMode.Interlaced, overscan: false });

    // Assert
    expect(geometry.height).toBe(896);
  });

  it('crops 5 percent from each edge for overscan and keeps the aspect ratio', () => {
    // Arrange
    const signal = image(683, 224, 0.4286);

    // Act
    const [full, cropped] = [false, true].map((overscan) =>
      displayGeometry({ image: signal, scan: ScanMode.Progressive, overscan })
    );

    // Assert
    expect(cropped?.crop).toBe(0.05);
    expect((cropped?.width ?? 0) / (cropped?.height ?? 1)).toBeCloseTo(
      (full?.width ?? 0) / (full?.height ?? 1),
      2
    );
  });

  it('keeps the canvas within 4096 pixels on its longest side', () => {
    // Arrange
    const signal = image(2731, 1024, 0.4286);

    // Act
    const geometry = displayGeometry({
      image: signal,
      scan: ScanMode.Progressive,
      overscan: false
    });

    // Assert
    expect(Math.max(geometry.width, geometry.height)).toBeLessThanOrEqual(4096);
    expect(geometry.height).toBeGreaterThanOrEqual(1024);
  });
});
