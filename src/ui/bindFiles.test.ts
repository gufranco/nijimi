import { describe, expect, it } from 'vitest';

import { bindFiles } from './bindFiles';
import { FileSlot } from './fileSlot';
import { queryElements } from './queryElements';
import { SHELL_HTML } from './shellHtml';
import type { Elements } from './queryElements';

interface Setup {
  readonly root: HTMLDivElement;
  readonly elements: Elements;
  readonly received: string[];
}

const setup = (): Setup => {
  const root = document.createElement('div');
  root.innerHTML = SHELL_HTML;
  document.body.append(root);
  const elements = queryElements(root);
  const received: string[] = [];
  bindFiles({
    elements,
    doc: document,
    onFile: (file, slot) => received.splice(received.length, 0, `${slot}:${file.name}`)
  });
  return { root, elements, received };
};

const png = (name: string): File =>
  new File([new Uint8Array([0x89, 0x50])], name, { type: 'image/png' });

const transfer = (...files: File[]): DataTransfer => {
  const data = new DataTransfer();
  files.forEach((file) => data.items.add(file));
  return data;
};

describe('bindFiles', () => {
  it('hands a picked file to the main slot', () => {
    // Arrange
    const { root, elements, received } = setup();
    Object.defineProperty(elements.fileInput, 'files', { value: transfer(png('art.png')).files });

    // Act
    elements.fileInput.dispatchEvent(new Event('change'));

    // Assert
    expect(received).toEqual([`${FileSlot.Main}:art.png`]);
    root.remove();
  });

  it('hands a picked flicker frame to the flicker slot', () => {
    // Arrange
    const { root, elements, received } = setup();
    Object.defineProperty(elements.flickerInput, 'files', { value: transfer(png('b.png')).files });

    // Act
    elements.flickerInput.dispatchEvent(new Event('change'));

    // Assert
    expect(received).toEqual([`${FileSlot.Flicker}:b.png`]);
    root.remove();
  });

  it('ignores a picker closed without a file', () => {
    // Arrange
    const { root, elements, received } = setup();

    // Act
    elements.fileInput.dispatchEvent(new Event('change'));

    // Assert
    expect(received).toEqual([]);
    root.remove();
  });

  it('opens the pickers from their buttons', () => {
    // Arrange
    const { root, elements } = setup();
    const opened: string[] = [];
    elements.fileInput.addEventListener('click', (event) => {
      event.preventDefault();
      opened.splice(opened.length, 0, 'main');
    });
    elements.flickerInput.addEventListener('click', (event) => {
      event.preventDefault();
      opened.splice(opened.length, 0, 'flicker');
    });

    // Act
    elements.chooseButton.click();
    elements.flickerButton.click();

    // Assert
    expect(opened).toEqual(['main', 'flicker']);
    root.remove();
  });

  it('takes a file dropped on the screen and highlights the drop target meanwhile', () => {
    // Arrange
    const { root, elements, received } = setup();
    const data = transfer(png('drop.png'));
    elements.screen.dispatchEvent(
      new DragEvent('dragover', { dataTransfer: data, cancelable: true })
    );
    const highlighted = elements.screen.classList.contains('is-dragging');

    // Act
    elements.screen.dispatchEvent(new DragEvent('drop', { dataTransfer: data, cancelable: true }));

    // Assert
    expect(highlighted).toBe(true);
    expect(elements.screen.classList.contains('is-dragging')).toBe(false);
    expect(received).toEqual([`${FileSlot.Main}:drop.png`]);
    root.remove();
  });

  it('clears the highlight when the drag leaves and ignores an empty drop', () => {
    // Arrange
    const { root, elements, received } = setup();
    elements.screen.dispatchEvent(new DragEvent('dragover', { cancelable: true }));

    // Act
    elements.screen.dispatchEvent(new DragEvent('dragleave'));
    elements.screen.dispatchEvent(new DragEvent('drop', { cancelable: true }));

    // Assert
    expect(elements.screen.classList.contains('is-dragging')).toBe(false);
    expect(received).toEqual([]);
    root.remove();
  });

  it('takes a pasted file and ignores a paste without one', () => {
    // Arrange
    const { root, received } = setup();
    const withFile = new ClipboardEvent('paste', { clipboardData: transfer(png('paste.png')) });

    // Act
    document.dispatchEvent(withFile);
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer() }));
    document.dispatchEvent(new ClipboardEvent('paste'));

    // Assert
    expect(received).toEqual([`${FileSlot.Main}:paste.png`]);
    root.remove();
  });
});
