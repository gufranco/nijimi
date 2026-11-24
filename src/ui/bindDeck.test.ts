import { afterEach, describe, expect, it } from 'vitest';

import { bindDeck } from './bindDeck';
import { queryElements } from './queryElements';
import { SHELL_HTML } from './shellHtml';

const roots: HTMLElement[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    root.remove();
  });
});

describe('bindDeck', () => {
  it('sends each deck button and the tape position slider to its transport command', async () => {
    // Arrange
    const root = document.createElement('div');
    root.innerHTML = SHELL_HTML;
    document.body.append(root);
    roots.splice(roots.length, 0, root);
    const elements = queryElements(root);
    const calls: string[] = [];
    const record =
      (name: string) =>
      (value?: number): Promise<void> => {
        calls.splice(calls.length, 0, value === undefined ? name : `${name} ${String(value)}`);
        return Promise.resolve();
      };
    let pending: Promise<unknown> = Promise.resolve();
    bindDeck({
      elements,
      transport: {
        toggle: record('toggle'),
        pause: record('pause'),
        rewind: record('rewind'),
        step: record('step'),
        jump: record('jump'),
        seek: record('seek')
      },
      track: (work) => {
        pending = Promise.all([pending, work]);
      }
    });
    [
      elements.vcrStop,
      elements.vcrRewind,
      elements.vcrBack,
      elements.vcrPlay,
      elements.vcrForward,
      elements.vcrFastForward
    ].forEach((button) => {
      button.removeAttribute('disabled');
    });

    // Act
    await [
      elements.vcrStop,
      elements.vcrRewind,
      elements.vcrBack,
      elements.vcrPlay,
      elements.vcrForward,
      elements.vcrFastForward
    ].reduce(async (previous, button) => {
      await previous;
      button.click();
      await pending;
    }, Promise.resolve());
    elements.vcrSeek.removeAttribute('disabled');
    elements.vcrSeek.max = '9';
    elements.vcrSeek.value = '7';
    elements.vcrSeek.dispatchEvent(new Event('input'));
    await pending;

    // Assert
    expect(calls).toEqual([
      'pause',
      'rewind',
      'jump -5',
      'step -1',
      'toggle',
      'step 1',
      'jump 5',
      'seek 7'
    ]);
  });
});
