import { afterEach, describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import { queryElements } from './queryElements';
import type { Elements } from './queryElements';
import { renderDeck } from './renderDeck';
import { SHELL_HTML } from './shellHtml';

const roots: HTMLElement[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    root.remove();
  });
});

const deck = (): Elements => {
  const root = document.createElement('div');
  root.innerHTML = SHELL_HTML;
  document.body.append(root);
  roots.splice(roots.length, 0, root);
  return queryElements(root);
};

describe('renderDeck', () => {
  it('shows the tape position and a pause button while a clip plays', () => {
    // Arrange
    const elements = deck();

    // Act
    renderDeck({
      elements,
      locale: Locale.En,
      fieldRate: 50,
      state: { field: 3000, count: 4000, playing: true }
    });

    // Assert
    expect(elements.vcrCounter.textContent).toBe('0:01:00');
    expect([elements.vcrPlay.dataset['icon'], elements.vcrPlay.getAttribute('aria-label')]).toEqual(
      ['pause', 'Pause']
    );
    expect([elements.vcrDeck.hasAttribute('data-loaded'), elements.vcrStop.disabled]).toEqual([
      true,
      false
    ]);
  });

  it('shows a play button while paused, in the chosen language', () => {
    // Arrange
    const elements = deck();

    // Act
    renderDeck({
      elements,
      locale: Locale.PtBr,
      fieldRate: 50,
      state: { field: 0, count: 10, playing: false }
    });

    // Assert
    expect([
      elements.vcrPlay.dataset['icon'],
      elements.vcrPlay.getAttribute('aria-label'),
      elements.vcrPlay.getAttribute('data-i18n-label')
    ]).toEqual(['play', 'Reproduzir', 'deckPlay']);
  });

  it('empties the deck and disables its buttons without a clip', () => {
    // Arrange
    const elements = deck();
    renderDeck({
      elements,
      locale: Locale.En,
      fieldRate: 50,
      state: { field: 1, count: 10, playing: true }
    });

    // Act
    renderDeck({ elements, locale: Locale.En, fieldRate: 50, state: null });

    // Assert
    expect([
      elements.vcrCounter.textContent,
      elements.vcrDeck.hasAttribute('data-loaded'),
      elements.vcrFastForward.disabled
    ]).toEqual(['-:--:--', false, true]);
  });
});
