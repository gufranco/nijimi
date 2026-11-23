import { describe, expect, it } from 'vitest';

import { VIEW } from './viewTransform';

const VIEWPORT = { width: 400, height: 300 };

describe('VIEW', () => {
  it('starts at 1x with no offset', () => {
    // Arrange
    const start = VIEW.identity;

    // Act
    const summary = [start.scale, start.x, start.y];

    // Assert
    expect(summary).toEqual([1, 0, 0]);
  });

  it('zooms in around the pointer so the point under it stays put', () => {
    // Arrange
    const point = { x: 100, y: 75 };

    // Act
    const view = VIEW.zoomAt(VIEW.identity, VIEWPORT, point, 2);

    // Assert
    expect(view).toEqual({ scale: 2, x: -100, y: -75 });
  });

  it('never zooms out past 1x or in past 16x', () => {
    // Arrange
    const centre = { x: 200, y: 150 };

    // Act
    const [outward, inward] = [0.25, 100].map((factor) =>
      VIEW.zoomAt(VIEW.identity, VIEWPORT, centre, factor)
    );

    // Assert
    expect(outward).toEqual({ scale: 1, x: 0, y: 0 });
    expect(inward?.scale).toBe(16);
  });

  it('pans within the zoomed picture and stops at its edges', () => {
    // Arrange
    const zoomed = { scale: 2, x: -100, y: -75 };

    // Act
    const [inside, beyond] = [
      VIEW.panBy(zoomed, VIEWPORT, 50, -25),
      VIEW.panBy(zoomed, VIEWPORT, 500, -900)
    ];

    // Assert
    expect(inside).toEqual({ scale: 2, x: -50, y: -100 });
    expect(beyond).toEqual({ scale: 2, x: 0, y: -300 });
  });

  it('does not pan at 1x', () => {
    // Arrange
    const start = VIEW.identity;

    // Act
    const view = VIEW.panBy(start, VIEWPORT, 40, 40);

    // Assert
    expect(view).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('writes a CSS transform that scales from the top-left corner', () => {
    // Arrange
    const view = { scale: 2.5, x: -12, y: -30 };

    // Act
    const css = VIEW.toCss(view);

    // Assert
    expect(css).toBe('translate(-12px, -30px) scale(2.5)');
  });
});
