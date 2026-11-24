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
  [
    elements.vcrStop,
    elements.vcrRewind,
    elements.vcrBack,
    elements.vcrPlay,
    elements.vcrForward,
    elements.vcrFastForward
  ].forEach((button) => {
    button.toggleAttribute('disabled', state === null);
  });
  elements.vcrPlay.setAttribute('data-icon', playing ? 'pause' : 'play');
  elements.vcrPlay.setAttribute('data-i18n-label', label);
  elements.vcrPlay.setAttribute('aria-label', translate(input.locale, label));
  elements.vcrCounter.replaceChildren(
    state === null ? EMPTY_COUNTER : formatCounter(state.field / input.fieldRate)
  );
};
