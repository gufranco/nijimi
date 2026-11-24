import { canDecodeVideo } from 'mediabunny';
import { describe, expect, it } from 'vitest';

describe('main', () => {
  it('starts the app in the page container, able to decode VP9 of undefined level', async () => {
    // Arrange
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);

    // Act
    await import('./main');

    // Assert
    expect(root.querySelector('#crt-canvas')).toBeInstanceOf(HTMLCanvasElement);
    expect(
      await canDecodeVideo('vp9', { codec: 'vp09.00.00.08', codedWidth: 16, codedHeight: 8 })
    ).toBe(true);
    root.remove();
  });
});
