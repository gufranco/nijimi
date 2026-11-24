import type { Clock } from './clipClock';

const MS_PER_SECOND = 1000;

export const createWallClock = (now: () => number): Clock => {
  let origin = now();
  let at = 0;
  let running = false;
  const time = (): number => (running ? (now() - origin) / MS_PER_SECOND : at);
  return {
    time,
    playing: () => running,
    play: () => {
      if (!running) {
        origin = now() - at * MS_PER_SECOND;
        running = true;
      }
      return Promise.resolve();
    },
    pause: () => {
      if (running) {
        at = time();
        running = false;
      }
    },
    seek: (seconds) => {
      at = seconds;
      origin = now() - seconds * MS_PER_SECOND;
    }
  };
};
