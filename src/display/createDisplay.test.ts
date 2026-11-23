import { describe, expect, it } from 'vitest';

import { createDisplay } from './createDisplay';
import { DisplayKind } from './displayKind';

describe('createDisplay', () => {
  it('picks WebGL2 when the browser offers it', () => {
    // Arrange
    const canvas = document.createElement('canvas');

    // Act
    const display = createDisplay(canvas);

    // Assert
    expect(display.kind).toBe(DisplayKind.WebGl2);
  });

  it('falls back to the 2D canvas when WebGL2 is missing', () => {
    // Arrange
    const canvas = document.createElement('canvas');
    const withoutWebGl = (): null => null;

    // Act
    const display = createDisplay(canvas, withoutWebGl);

    // Assert
    expect(display.kind).toBe(DisplayKind.Canvas2d);
  });
});
