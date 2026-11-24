import type { Elements } from './queryElements';

const JUMP_SECONDS = 5;

export interface Transport {
  readonly toggle: () => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly rewind: () => Promise<void>;
  readonly step: (fields: number) => Promise<void>;
  readonly jump: (seconds: number) => Promise<void>;
  readonly seek: (field: number) => Promise<void>;
}

export const bindDeck = (input: {
  readonly elements: Elements;
  readonly transport: Transport;
  readonly track: (work: Promise<unknown>) => void;
}): void => {
  const { elements, transport, track } = input;
  const on = (button: HTMLButtonElement, command: () => Promise<void>): void => {
    button.addEventListener('click', () => {
      track(command());
    });
  };
  on(elements.vcrStop, async () => {
    await transport.pause();
    await transport.rewind();
  });
  on(elements.vcrRewind, () => transport.jump(-JUMP_SECONDS));
  on(elements.vcrBack, () => transport.step(-1));
  on(elements.vcrPlay, transport.toggle);
  on(elements.vcrForward, () => transport.step(1));
  on(elements.vcrFastForward, () => transport.jump(JUMP_SECONDS));
  elements.vcrSeek.addEventListener('input', () => {
    track(transport.seek(elements.vcrSeek.valueAsNumber));
  });
};
