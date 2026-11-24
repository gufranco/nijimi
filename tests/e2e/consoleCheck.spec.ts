import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { encodePng } from './fixtures/encodePng';
import { confirmRender, openPage, waitForRender } from './support';

const GENESIS = './#p=genesis-h40&x=1';

const load = async (
  page: Page,
  width: number,
  height: number,
  pixel: (x: number, y: number) => readonly [number, number, number]
): Promise<void> => {
  await page.locator('#file-input').setInputFiles({
    name: 'art.png',
    mimeType: 'image/png',
    buffer: encodePng(width, height, pixel)
  });
  await confirmRender(page);
  await waitForRender(page);
};

const line = (page: Page, index: number): ReturnType<Page['locator']> =>
  page.locator('#console-check-list li').nth(index);

test('passes Genesis H40 art that uses 16 colors on a 2-bit grid', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await load(page, 320, 224, (x, y) => [(x % 4) * 85, (y % 4) * 85, 0]);

  // Assert
  await expect(page.getByRole('heading', { name: 'Console check' })).toBeVisible();
  await expect(page.locator('#console-check-list li')).toHaveText([
    '320x224: a native resolution of this preset.',
    '16 colors on screen, within the limit of 61.',
    'Up to 4 levels per color channel, within the 8 of its palette.'
  ]);
  expect(problems).toEqual([]);
});

test('names the presets that draw a 256-wide picture loaded under H40', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await load(page, 256, 224, (x, y) => [(x % 4) * 85, (y % 4) * 85, 0]);

  // Assert
  await expect(line(page, 0)).toHaveText('256x224: not a resolution this preset draws.');
  await expect(line(page, 1)).toHaveText(
    'Presets that draw this size: NES; SNES, 256 wide; Genesis, H32; Master System; PlayStation, 256 wide; Atari 5200, 320 wide; Atari Jaguar, 256 wide.'
  );
  expect(problems).toEqual([]);
});

test('fails a picture with more colors than shadow/highlight can show', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await load(page, 320, 224, (x, y) => [x % 256, y % 256, 0]);

  // Assert
  await expect(line(page, 1)).toHaveText(
    /colors on screen: more than the 183 this console can show\.$/
  );
  expect(problems).toEqual([]);
});

test('asks for shadow/highlight at 12 levels per channel and fails at 20', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  await load(page, 320, 224, (x) => [(x % 12) * 20, 0, 0]);
  await expect(line(page, 2)).toHaveText(
    '12 levels per color channel: needs shadow/highlight, which allows up to 15.'
  );

  // Act
  await load(page, 320, 224, (x) => [(x % 20) * 12, 0, 0]);

  // Assert
  await expect(line(page, 2)).toHaveText(
    '20 levels per color channel: more than the 15 its palette has.'
  );
  expect(problems).toEqual([]);
});

test('has no accessibility violations with a failing console check', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  await load(page, 300, 200, (x, y) => [x % 256, y % 256, (x * y) % 256]);
  await expect(line(page, 0)).toHaveText('300x200: not a resolution this preset draws.');

  // Act
  const results = await new AxeBuilder({ page }).include('#console-check').analyze();

  // Assert
  expect(results.violations).toEqual([]);
  expect(problems).toEqual([]);
});
