import { STANDARDS } from './standards';
import type { LineTiming } from './types';
import type { VideoStandard } from './videoStandard';

const FIELDS_PER_SHORT_LINE = 2;

export const fieldRate = (timing: LineTiming, standard: VideoStandard): number =>
  STANDARDS[standard].subcarrierHz /
  (timing.linesPerFrame * timing.cyclesPerLine - timing.shortLineCycles / FIELDS_PER_SHORT_LINE);
