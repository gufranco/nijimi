import { describe, expect, it } from 'vitest';

import { queryElements } from './queryElements';
import { SHELL_HTML } from './shellHtml';
import type { Elements } from './queryElements';

describe('queryElements', () => {
  it('finds every element the app drives in the shell', () => {
    // Arrange
    const root = document.createElement('div');
    root.innerHTML = SHELL_HTML;

    // Act
    const elements = queryElements(root);

    // Assert
    expect(elements.form.id).toBe('controls');
    expect(elements.crtCanvas).toBeInstanceOf(HTMLCanvasElement);
    expect(elements.fileInput.accept).toBe('image/png');
  });

  it('fails fast naming a missing element', () => {
    // Arrange
    const root = document.createElement('div');

    // Act
    const query = (): Elements => queryElements(root);

    // Assert
    expect(query).toThrow('#controls is missing or is not a HTMLFormElement');
  });
});
