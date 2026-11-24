const MACROBLOCK = 16;
const PICTURE_SIZE_FACTOR = 8;
const PROFILES = ['6400', '4d00', '4240'] as const;

const LEVELS: readonly (readonly [string, number, number])[] = [
  ['0a', 1_485, 99],
  ['0b', 3_000, 396],
  ['0c', 6_000, 396],
  ['0d', 11_880, 396],
  ['14', 11_880, 396],
  ['15', 19_800, 792],
  ['16', 20_250, 1_620],
  ['1e', 40_500, 1_620],
  ['1f', 108_000, 3_600],
  ['20', 216_000, 5_120],
  ['28', 245_760, 8_192],
  ['29', 245_760, 8_192],
  ['2a', 522_240, 8_704],
  ['32', 589_824, 22_080],
  ['33', 983_040, 36_864],
  ['34', 2_073_600, 36_864],
  ['3c', 4_177_920, 139_264],
  ['3d', 8_355_840, 139_264],
  ['3e', 16_711_680, 139_264]
];
const HIGHEST = '3e';

export const avcCodecStrings = (input: {
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}): readonly string[] => {
  const across = Math.ceil(input.width / MACROBLOCK);
  const down = Math.ceil(input.height / MACROBLOCK);
  const level =
    LEVELS.find(
      ([, maxRate, maxFrame]) =>
        across * down <= maxFrame &&
        Math.max(across, down) <= Math.sqrt(maxFrame * PICTURE_SIZE_FACTOR) &&
        across * down * input.frameRate <= maxRate
    )?.[0] ?? HIGHEST;
  return PROFILES.map((profile) => `avc1.${profile}${level}`);
};
