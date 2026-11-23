import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { corruptPng, encodePng } from './fixtures/encodePng';
import { ART, loadArt, openPage, PNG_FILE, waitForRender } from './support';

test('shows the empty CRT set with no accessibility violations', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  const results = await new AxeBuilder({ page }).analyze();

  // Assert
  await expect(page.getByRole('button', { name: 'Choose PNG' })).toBeVisible();
  expect(results.violations).toEqual([]);
  expect(problems).toEqual([]);
});

test('renders a PNG chosen with the picker, with no accessibility violations', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  await loadArt(page);

  // Assert
  await expect(page.locator('#empty-state')).toBeHidden();
  await expect(page.locator('#source-info')).toHaveText('64 x 48 native');
  await expect(page.locator('#export-button')).toBeEnabled();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(problems).toEqual([]);
});

test('opens the file picker from the keyboard', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Choose PNG' }).focus();

  // Act
  await page.keyboard.press('Enter');

  // Assert
  await (await chooser).setFiles(PNG_FILE);
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('renders a PNG dropped on the screen', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const transfer = await page.evaluateHandle((bytes: number[]) => {
    const data = new DataTransfer();
    data.items.add(new File([new Uint8Array(bytes)], 'drop.png', { type: 'image/png' }));
    return data;
  }, Array.from(ART));

  // Act
  await page.locator('#screen').dispatchEvent('drop', { dataTransfer: transfer });

  // Assert
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('renders a pasted PNG', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const bytes = Array.from(ART);

  // Act
  await page.evaluate((data: number[]) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(data)], 'paste.png', { type: 'image/png' }));
    document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: transfer }));
  }, bytes);

  // Assert
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('refuses a JPEG and keeps the screen empty', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const jpeg = {
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
  };

  // Act
  await page.locator('#file-input').setInputFiles(jpeg);

  // Assert
  await expect(page.locator('#notice')).toHaveText('Only PNG files are supported.');
  await expect(page.locator('#empty-state')).toBeVisible();
  expect(problems).toEqual([]);
});

test('refuses a PNG that cannot be decoded', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const broken = { name: 'broken.png', mimeType: 'image/png', buffer: corruptPng(16, 16) };

  // Act
  await page.locator('#file-input').setInputFiles(broken);

  // Assert
  await expect(page.locator('#notice')).toHaveText('This file could not be decoded as a PNG.');
  expect(
    problems.filter(
      (problem) => !/PNG integrity check failed|The input data is corrupted/.test(problem)
    )
  ).toEqual([]);
});

test('refuses art wider than 1024 native pixels', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const wide = {
    name: 'wide.png',
    mimeType: 'image/png',
    buffer: encodePng(1100, 2, (x) => [x % 2 === 0 ? 0 : 255, 0, 0])
  };

  // Act
  await page.locator('#file-input').setInputFiles(wide);

  // Assert
  await expect(page.locator('#notice')).toHaveText(
    'This PNG is 1100 x 2 at its native scale. The limit is 1024 x 1024.'
  );
  expect(problems).toEqual([]);
});

test('detects a 4x export and processes it at native size', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  const upscaled = encodePng(256, 192, (x, y) => [((x >> 2) * 9) % 256, ((y >> 2) * 7) % 256, 90]);

  // Act
  await page
    .locator('#file-input')
    .setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: upscaled });

  // Assert
  await waitForRender(page);
  await expect(page.locator('#source-info')).toHaveText('64 x 48 native, Detected 4x scale');
  expect(problems).toEqual([]);
});

test('switches to RF, updates the link and shows the RF tuner', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await loadArt(page);

  // Act
  await page.getByRole('radio', { name: 'RF', exact: true }).check();

  // Assert
  await expect(page).toHaveURL(/#c=rf$/);
  await expect(page.getByRole('group', { name: 'RF tuner' })).toBeVisible();
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('restores settings from a shared link', async ({ page }) => {
  // Arrange
  const link = './#c=svideo&s=pal-m&p=genesis-h40';

  // Act
  const problems = await openPage(page, link);

  // Assert
  await expect(page.locator('input[name=c][value=svideo]')).toBeChecked();
  await expect(page.locator('select[name=s]')).toHaveValue('pal-m');
  await expect(page.locator('select[name=p]')).toHaveValue('genesis-h40');
  expect(problems).toEqual([]);
});

test('falls back to defaults and names an invalid link value', async ({ page }) => {
  // Arrange
  const link = './#c=scart';

  // Act
  const problems = await openPage(page, link);

  // Assert
  await expect(page.locator('#notice')).toHaveText(
    'Ignored link values that are not valid: c=scart'
  );
  await expect(page.locator('input[name=c][value=composite]')).toBeChecked();
  expect(problems).toEqual([]);
});

test('shows the original over the CRT and zooms the screen', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await loadArt(page);

  // Act
  await page.getByLabel('Compare with the original').check();
  await page.locator('input[name=zoom][value="2"]').check({ force: true });

  // Assert
  await expect(page.locator('#source-canvas')).toBeVisible();
  await expect(page.locator('#canvas-wrap')).toHaveAttribute('data-zoom', '2');
  expect(problems).toEqual([]);
});

test('exports the preview as a PNG download', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await loadArt(page);
  const download = page.waitForEvent('download');

  // Act
  await page.getByRole('button', { name: 'Export PNG' }).click();

  // Assert
  expect((await download).suggestedFilename()).toBe('nijimi-crt.png');
  expect(problems).toEqual([]);
});

test('makes no network request after the page has loaded', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await page.waitForLoadState('networkidle');
  const requests: string[] = [];
  page.on('request', (request) => requests.push(request.url()));

  // Act
  await loadArt(page);
  await page.getByRole('radio', { name: 'S-Video', exact: true }).check();
  await waitForRender(page);

  // Assert
  expect(requests.filter((url) => !url.startsWith('blob:') && !url.startsWith('data:'))).toEqual(
    []
  );
  expect(problems).toEqual([]);
});

test('lays out without horizontal scrolling', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await loadArt(page);

  // Act
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );

  // Assert
  expect(overflow).toBeLessThanOrEqual(0);
  expect(problems).toEqual([]);
});
