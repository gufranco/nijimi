import type { Locale } from '../i18n/locale';
import { translate } from '../i18n/translate';
import type { PlayerState } from './createClipPlayer';
import { formatCounter } from './formatCounter';
import type { Elements } from './queryElements';

const EMPTY_COUNTER = '-:--:--';

export const renderDeck = (input: {
  readonly elements: Elements;
  readonly locale: Locale;
  readonly fieldRate: number;
  readonly state: PlayerState | null;
}): void => {
  const { elements, state } = input;
  const playing = state?.playing ?? false;
  const label = playing ? 'deckPause' : 'deckPlay';
  elements.vcrDeck.toggleAttribute('data-loaded', state !== null);
  if (state === null) {
    elements.vcrDeck.removeAttribute('data-state');
  } else {
    elements.vcrDeck.setAttribute('data-state', playing ? 'playing' : 'paused');
  }
  [
    elements.vcrStop,
    elements.vcrRewind,
    elements.vcrBack,
    elements.vcrPlay,
    elements.vcrForward,
    elements.vcrFastForward,
    elements.vcrSeek
  ].forEach((control) => {
    control.toggleAttribute('disabled', state === null);
  });
  elements.vcrPlay.setAttribute('data-icon', playing ? 'pause' : 'play');
  elements.vcrPlay.setAttribute('data-i18n-label', label);
  elements.vcrPlay.setAttribute('aria-label', translate(input.locale, label));
  const counter = state === null ? EMPTY_COUNTER : formatCounter(state.field / input.fieldRate);
  elements.vcrCounter.replaceChildren(counter);
  elements.vcrSeek.max = String(Math.max(0, (state?.count ?? 1) - 1));
  elements.vcrSeek.value = String(state?.field ?? 0);
  elements.vcrSeek.setAttribute('aria-valuetext', counter);
};
