import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { decodePng } from './fixtures/decodePng';
import type { DecodedPng } from './fixtures/decodePng';
import { encodePng } from './fixtures/encodePng';
import { confirmRender, openPage, waitForRender } from './support';

const PLAIN = 'c=rgb&b=0&cv=0&x=1';
const GREY = encodePng(32, 24, () => [128, 128, 128]);
const WHITE = encodePng(32, 24, () => [255, 255, 255]);
const LINES = encodePng(32, 24, (x, y) => {
  if (y !== 12) {
    return [0, 0, 0];
  }
  return x < 16 ? [255, 255, 255] : [77, 77, 77];
});

interface Exported {
  readonly image: DecodedPng;
  readonly webgl: boolean;
}

const toLinear = (byte: number): number => {
  const value = byte / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const exported = async (page: Page, hash: string, png: Buffer): Promise<Exported> => {
  const problems = await openPage(page, `./#${hash}`);
  const webgl = await page.evaluate(
    () => document.createElement('canvas').getContext('webgl2') !== null
  );
  await page
    .locator('#file-input')
    .setInputFiles({ name: 'art.png', mimeType: 'image/png', buffer: png });
  await confirmRender(page);
  await waitForRender(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const image = decodePng(await readFile(await (await download).path()));
  expect(problems).toEqual([]);
  return { image, webgl };
};

const middle = <T>(values: readonly T[]): readonly T[] =>
  values.slice(Math.floor(values.length / 4), Math.floor((3 * values.length) / 4));

const column = (image: DecodedPng, x: number): readonly (readonly number[])[] =>
  Array.from({ length: image.height }, (_, y) => image.pixel(x, y));

const greenProfile = (image: DecodedPng, x: number): readonly number[] =>
  column(image, x).map((rgb) => toLinear(rgb[1] ?? 0));

const widthAboveHalf = (profile: readonly number[]): number => {
  const peak = Math.max(...profile);
  return profile.filter((value) => value >= peak / 2).length;
};

const dominant = (rgb: readonly number[]): number => rgb.indexOf(Math.max(...rgb));

test('C16 shows a 50 percent grey at gamma 2.4 as sRGB level 121 wherever WebGL2 runs, and unchanged without it', async ({
  page
}) => {
  // Arrange
  const hash = `${PLAIN}&m=none&sl=0`;

  // Act
  const { image, webgl } = await exported(page, hash, GREY);

  // Assert
  const [, green] = image.pixel(image.width >> 1, image.height >> 1);
  expect(Math.abs(green - (webgl ? 121 : 128))).toBeLessThanOrEqual(5);
});

test('C08 opens dark gaps between 240p lines of a mid grey wherever WebGL2 runs', async ({
  page
}) => {
  // Arrange
  const hash = `${PLAIN}&m=none&sl=1`;

  // Act
  const { image, webgl } = await exported(page, hash, GREY);

  // Assert
  const centre = middle(greenProfile(image, image.width >> 1));
  const gaps = Math.max(...centre) / Math.max(Math.min(...centre), 1e-3) > 1.5;
  expect(gaps).toBe(webgl);
});

test('C17 widens the beam of a bright line over a dim one wherever WebGL2 runs', async ({
  page
}) => {
  // Arrange
  const hash = `${PLAIN}&m=none&sl=1`;

  // Act
  const { image, webgl } = await exported(page, hash, LINES);

  // Assert
  const [bright, dim] = [image.width >> 2, (3 * image.width) >> 2].map((x) =>
    widthAboveHalf(greenProfile(image, x))
  );
  expect((bright ?? 0) > (dim ?? 0)).toBe(webgl);
});

test('C18 breaks a slot mask with a dark row every 4 rows wherever WebGL2 runs', async ({
  page
}) => {
  // Arrange
  const hash = `${PLAIN}&m=slot-mask&ms=1&sl=0`;

  // Act
  const { image, webgl } = await exported(page, hash, WHITE);

  // Assert
  const dark = middle(column(image, image.width >> 1).map((rgb, y) => [y, Math.max(...rgb)]))
    .filter(([, peak]) => peak === 0)
    .map(([y]) => y ?? 0);
  const gaps = dark.slice(1).map((y, index) => y - (dark[index] ?? 0));
  expect(gaps.length > 1 && gaps.every((gap) => gap === 4)).toBe(webgl);
});

test('C18 shifts shadow mask triads every 2 rows wherever WebGL2 runs', async ({ page }) => {
  // Arrange
  const hash = `${PLAIN}&m=shadow-mask&ms=1&sl=0`;

  // Act
  const { image, webgl } = await exported(page, hash, WHITE);

  // Assert
  const channels = middle(column(image, image.width >> 1)).map(dominant);
  const runs = channels.reduce<readonly number[]>(
    (lengths, channel, index) =>
      index > 0 && channel === channels[index - 1]
        ? [...lengths.slice(0, -1), (lengths.at(-1) ?? 0) + 1]
        : [...lengths, 1],
    []
  );
  const inner = runs.slice(1, -1);
  expect(inner.length > 1 && inner.every((run) => run === 2)).toBe(webgl);
});
