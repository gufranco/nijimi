import type { MessageKey } from '../i18n/types';

interface FullscreenDocument extends EventTarget {
  readonly fullscreenEnabled: boolean;
  readonly fullscreenElement: Element | null;
  readonly exitFullscreen: () => Promise<void>;
}

export const bindFullscreen = (input: {
  readonly button: HTMLButtonElement;
  readonly target: HTMLElement;
  readonly doc: FullscreenDocument;
  readonly label: (key: MessageKey) => string;
  readonly track: (work: Promise<unknown>) => void;
  readonly onError: (error: unknown) => void;
}): void => {
  input.button.toggleAttribute('hidden', !input.doc.fullscreenEnabled);
  input.button.addEventListener('click', () => {
    const change =
      input.doc.fullscreenElement === null
        ? input.target.requestFullscreen()
        : input.doc.exitFullscreen();
    input.track(change.catch(input.onError));
  });
  input.doc.addEventListener('fullscreenchange', () => {
    const key: MessageKey = input.doc.fullscreenElement === null ? 'fullscreen' : 'exitFullscreen';
    input.button.setAttribute('data-i18n', key);
    input.button.replaceChildren(input.label(key));
  });
};
