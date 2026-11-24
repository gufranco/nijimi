import { VideoStandard } from './videoStandard';

export const regionOf = (standard: VideoStandard): 'ntsc' | 'pal' =>
  standard === VideoStandard.PalBg ? 'pal' : 'ntsc';
