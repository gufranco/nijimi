const LEVELS: readonly (readonly [number, string])[] = [
  [36_864, '10'],
  [73_728, '11'],
  [122_880, '20'],
  [245_760, '21'],
  [552_960, '30'],
  [983_040, '31'],
  [2_228_224, '40'],
  [8_912_896, '50'],
  [35_651_584, '60']
];
const HIGHEST = '62';

export const vp9LevelFor = (pictureSize: number): string =>
  LEVELS.find(([maxPictureSize]) => pictureSize <= maxPictureSize)?.[1] ?? HIGHEST;
