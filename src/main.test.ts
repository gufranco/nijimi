import { describe, expect, it } from 'vitest';

describe('main', () => {
  it('starts the app in the page container', async () => {
    // Arrange
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);

    // Act
    await import('./main');

    // Assert
    expect(root.querySelector('#crt-canvas')).toBeInstanceOf(HTMLCanvasElement);
    root.remove();
  });
});
