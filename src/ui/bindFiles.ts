import { FileSlot } from './fileSlot';
import type { Elements } from './queryElements';

type FileHandler = (file: File, slot: FileSlot) => void;

const firstFile = (files: FileList | null | undefined): File | null => files?.item(0) ?? null;

const bindPicker = (
  button: HTMLButtonElement,
  input: HTMLInputElement,
  slot: FileSlot,
  onFile: FileHandler
): void => {
  button.addEventListener('click', () => {
    input.click();
  });
  input.addEventListener('change', () => {
    const file = firstFile(input.files);
    if (file !== null) {
      onFile(file, slot);
    }
  });
};

const bindDrop = (screen: HTMLElement, onFile: FileHandler): void => {
  screen.addEventListener('dragover', (event) => {
    event.preventDefault();
    screen.classList.add('is-dragging');
  });
  screen.addEventListener('dragleave', () => {
    screen.classList.remove('is-dragging');
  });
  screen.addEventListener('drop', (event) => {
    event.preventDefault();
    screen.classList.remove('is-dragging');
    const file = firstFile(event.dataTransfer?.files);
    if (file !== null) {
      onFile(file, FileSlot.Main);
    }
  });
};

export const bindFiles = (input: {
  readonly elements: Elements;
  readonly doc: Document;
  readonly onFile: FileHandler;
}): void => {
  bindPicker(input.elements.chooseButton, input.elements.fileInput, FileSlot.Main, input.onFile);
  bindPicker(
    input.elements.flickerButton,
    input.elements.flickerInput,
    FileSlot.Flicker,
    input.onFile
  );
  bindDrop(input.elements.screen, input.onFile);
  input.doc.addEventListener('paste', (event) => {
    const file = firstFile(event.clipboardData?.files);
    if (file !== null) {
      input.onFile(file, FileSlot.Main);
    }
  });
};
