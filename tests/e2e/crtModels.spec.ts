import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import { decodePng } from './fixtures/decodePng';
import { encodePng } from './fixtures/encodePng';
import { confirmRender, openPage, waitForRender } from './support';

const WHITE = encodePng(128, 96, () => [255, 255, 255]);

test('moves the linked screen controls when a screen model is picked', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  await page.locator('#controls select[name=t]').selectOption('pvm');

  // Assert
  await expect(page.locator('input[name=sl]')).toHaveValue('1');
  await expect(page.locator('input[name=b]')).toHaveValue('0.15');
  await expect(page).toHaveURL(/t=pvm/);
  expect(problems).toEqual([]);
});

test('switches the model to custom when a linked control moves', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, './#t=bvm&sl=1&ms=0.25&b=0.1&cv=0');

  // Act
  await page.locator('input[name=b]').fill('0.5');

  // Assert
  await expect(page.locator('#controls select[name=t]')).toHaveValue('custom');
  expect(problems).toEqual([]);
});

test('switches to RGB and the handheld LCD screen when a Game Boy is picked', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  await page.locator('#controls select[name=p]').selectOption('game-boy');

  // Assert
  await expect(page.getByRole('radio', { name: 'RGB' })).toBeChecked();
  await expect(page.locator('#controls select[name=t]')).toHaveValue('lcd');
  await expect(page.locator('#controls select[name=m]')).toHaveValue('lcd-grid');
  expect(problems).toEqual([]);
});

test('exports an LCD grid with a dim gap every third pixel wherever WebGL2 runs', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, './#c=rgb&t=lcd');
  const webgl = await page.evaluate(
    () => document.createElement('canvas').getContext('webgl2') !== null
  );
  await page
    .locator('#file-input')
    .setInputFiles({ name: 'white.png', mimeType: 'image/png', buffer: WHITE });
  await confirmRender(page);
  await waitForRender(page);
  const download = page.waitForEvent('download');

  // Act
  await page.getByRole('button', { name: 'Export PNG' }).click();

  // Assert
  const image = decodePng(await readFile(await (await download).path()));
  const cx = Math.floor(image.width / 2) - 4;
  const cy = Math.floor(image.height / 2);
  const rowMean = (y: number): number =>
    Array.from({ length: 9 }, (_, offset) => image.pixel(cx + offset, y)[0]).reduce(
      (a, b) => a + b,
      0
    );
  const y = [cy, cy + 1, cy + 2].reduce(
    (best, row) => (rowMean(row) > rowMean(best) ? row : best),
    cy
  );
  const values = Array.from({ length: 9 }, (_, offset) => image.pixel(cx + offset, y)[0]);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const dim = values.flatMap((value, index) => (value < mean * 0.8 ? [index] : []));
  const grid = dim.length === 3 && dim.every((index) => index % 3 === (dim[0] ?? 0) % 3);
  expect(grid).toBe(webgl);
  expect(problems).toEqual([]);
});
