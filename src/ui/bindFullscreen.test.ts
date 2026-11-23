import { describe, expect, it } from 'vitest';

import { bindFullscreen } from './bindFullscreen';

interface FakePage {
  readonly doc: EventTarget & {
    fullscreenEnabled: boolean;
    fullscreenElement: Element | null;
    exitFullscreen: () => Promise<void>;
  };
  readonly target: HTMLElement;
  readonly button: HTMLButtonElement;
  readonly tracked: Promise<unknown>[];
  readonly failures: unknown[];
}

const fakePage = (
  enabled: boolean,
  request: () => Promise<void> = () => Promise.resolve()
): FakePage => {
  const target = document.createElement('div');
  Object.defineProperty(target, 'requestFullscreen', { value: request });
  const doc = Object.assign(new EventTarget(), {
    fullscreenEnabled: enabled,
    fullscreenElement: null as Element | null,
    exitFullscreen: (): Promise<void> => Promise.resolve()
  });
  const button = document.createElement('button');
  const tracked: Promise<unknown>[] = [];
  const failures: unknown[] = [];
  bindFullscreen({
    button,
    target,
    doc,
    label: (key) => `label:${key}`,
    track: (work) => tracked.splice(tracked.length, 0, work),
    onError: (error) => failures.splice(failures.length, 0, error)
  });
  return { doc, target, button, tracked, failures };
};

describe('bindFullscreen', () => {
  it('hides the button when the browser cannot go full screen', () => {
    // Arrange
    const enabled = false;

    // Act
    const page = fakePage(enabled);

    // Assert
    expect(page.button.hidden).toBe(true);
  });

  it('asks for full screen on the TV and relabels the button when it changes', () => {
    // Arrange
    const requested: string[] = [];
    const page = fakePage(true, () => {
      requested.splice(requested.length, 0, 'tv');
      return Promise.resolve();
    });

    // Act
    page.button.click();
    page.doc.fullscreenElement = page.target;
    page.doc.dispatchEvent(new Event('fullscreenchange'));

    // Assert
    expect(requested).toEqual(['tv']);
    expect(page.button.textContent).toBe('label:exitFullscreen');
    expect(page.button.getAttribute('data-i18n')).toBe('exitFullscreen');
  });

  it('leaves full screen on the second click and restores the label', () => {
    // Arrange
    const page = fakePage(true);
    page.doc.fullscreenElement = page.target;
    const left: string[] = [];
    page.doc.exitFullscreen = () => {
      left.splice(left.length, 0, 'exit');
      return Promise.resolve();
    };

    // Act
    page.button.click();
    page.doc.fullscreenElement = null;
    page.doc.dispatchEvent(new Event('fullscreenchange'));

    // Assert
    expect(left).toEqual(['exit']);
    expect(page.button.textContent).toBe('label:fullscreen');
  });

  it('reports a refused request', async () => {
    // Arrange
    const page = fakePage(true, () => Promise.reject(new Error('denied')));

    // Act
    page.button.click();

    // Assert
    await Promise.all(page.tracked);
    expect(page.failures).toHaveLength(1);
  });
});
