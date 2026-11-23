import { faker } from '@faker-js/faker';

import { bayerMatrix } from './bayerMatrix';
import { DIFFUSION_KERNELS } from './diffusionKernels';
import { errorDiffuse } from './errorDiffuse';
import { voidAndCluster } from './voidAndCluster';

export interface DitherPattern {
  readonly id: string;
  readonly name: string;
  readonly levels: number;
  readonly mask: (width: number, height: number) => Uint8Array;
}

const CLUSTERED_DOT = [
  [12, 5, 6, 13],
  [4, 0, 1, 7],
  [11, 3, 2, 8],
  [15, 10, 9, 14]
] as const;
const BLUE_NOISE_SIZE = 8;
const BLUE_NOISE_SEED = 17;
const WHITE_NOISE_SEED = 23;
const MULTI_LEVELS = 4;

const gradient = (x: number, width: number): number => (x + 0.5) / width;

const tile = (rule: (x: number, y: number) => boolean) => (width: number, height: number) =>
  Uint8Array.from({ length: width * height }, (_, index) =>
    rule(index % width, Math.floor(index / width)) ? 1 : 0
  );

const ordered = (matrix: readonly (readonly number[])[]) => (width: number, height: number) => {
  const size = matrix.length;
  return tile((x, y) => gradient(x, width) > (matrix[y % size]?.[x % size] ?? 0) / (size * size))(
    width,
    height
  );
};

const diffused = (name: string) => (width: number, height: number) =>
  errorDiffuse({
    level: (x) => gradient(x, width),
    width,
    height,
    kernel: DIFFUSION_KERNELS.find((kernel) => kernel.name === name)
  });

const blueNoise = (width: number, height: number): Uint8Array => {
  const ranks = voidAndCluster(BLUE_NOISE_SIZE, BLUE_NOISE_SEED);
  const cells = BLUE_NOISE_SIZE * BLUE_NOISE_SIZE;
  return tile(
    (x, y) =>
      gradient(x, width) >
      (ranks[(y % BLUE_NOISE_SIZE) * BLUE_NOISE_SIZE + (x % BLUE_NOISE_SIZE)] ?? 0) / cells
  )(width, height);
};

const whiteNoise = (width: number, height: number): Uint8Array => {
  faker.seed(WHITE_NOISE_SEED);
  return tile((x) => faker.number.float({ min: 0, max: 1 }) < gradient(x, width))(width, height);
};

const multiColour = (width: number, height: number): Uint8Array => {
  const matrix = bayerMatrix(4);
  return Uint8Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const scaled = gradient(x, width) * (MULTI_LEVELS - 1);
    const base = Math.floor(scaled);
    const threshold = (matrix[Math.floor(index / width) % 4]?.[x % 4] ?? 0) / 16;
    return Math.min(MULTI_LEVELS - 1, base + (scaled - base > threshold ? 1 : 0));
  });
};

const two = (id: string, name: string, mask: DitherPattern['mask']): DitherPattern => ({
  id,
  name,
  levels: 2,
  mask
});

export const DITHER_PATTERNS: readonly DitherPattern[] = [
  two(
    'P01',
    'checkerboard',
    tile((x, y) => (x + y) % 2 === 0)
  ),
  two(
    'P02',
    'vertical 1-pixel columns',
    tile((x) => x % 2 === 0)
  ),
  two(
    'P03',
    'horizontal 1-pixel rows',
    tile((_, y) => y % 2 === 0)
  ),
  two(
    'P04',
    'vertical 2-pixel columns',
    tile((x) => Math.floor(x / 2) % 2 === 0)
  ),
  two(
    'P05',
    'diagonal lines',
    tile((x, y) => (((x - y) % 4) + 4) % 4 === 0)
  ),
  two(
    'P06',
    'sparse 25 percent',
    tile((x, y) => x % 2 === 0 && y % 2 === 0)
  ),
  two(
    'P07',
    'dense 75 percent',
    tile((x, y) => !(x % 2 === 1 && y % 2 === 1))
  ),
  two('P08', 'Bayer 2x2', ordered(bayerMatrix(2))),
  two('P09', 'Bayer 4x4', ordered(bayerMatrix(4))),
  two('P10', 'Bayer 8x8', ordered(bayerMatrix(8))),
  two('P11', 'clustered-dot halftone', ordered(CLUSTERED_DOT)),
  two(
    'P12',
    'crosshatch',
    tile((x, y) => x % 4 === 0 || y % 4 === 0)
  ),
  two('P13', 'Floyd-Steinberg', diffused('floyd-steinberg')),
  two('P14', 'Atkinson', diffused('atkinson')),
  two('P15', 'Jarvis, Judice and Ninke', diffused('jarvis-judice-ninke')),
  two('P16', 'Stucki', diffused('stucki')),
  two('P17', 'Burkes', diffused('burkes')),
  two('P18', 'Sierra', diffused('sierra')),
  two('P19', 'Two-row Sierra', diffused('two-row-sierra')),
  two('P20', 'Sierra Lite', diffused('sierra-lite')),
  two('P21', 'blue noise, void and cluster', blueNoise),
  two('P22', 'white noise', whiteNoise),
  { id: 'P23', name: 'multi-colour ordered pattern', levels: MULTI_LEVELS, mask: multiColour },
  two(
    'P24',
    'flat fill',
    tile(() => false)
  )
];
