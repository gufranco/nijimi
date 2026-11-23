import type { LineTiming } from './types';

const fraction = (value: number): number => value - Math.floor(value);

export const lineCycles = (timing: LineTiming, frame: number, line: number): number => {
  const shortLines = Math.floor(frame / 2);
  const frameStart =
    frame * timing.linesPerFrame * timing.cyclesPerLine - shortLines * timing.shortLineCycles;
  return fraction(fraction(frameStart) + line * timing.cyclesPerLine);
};
