import { expect, test } from '@playwright/test';

import { canvasWidth, loadArt, openPage } from './support';

test('says CRT optics need WebGL2 when it is unavailable', async ({ page }) => {
  // Arrange
  const path = './';

  // Act
  const problems = await openPage(page, path);

  // Assert
  await expect(page.locator('#notice')).toHaveText(
    'CRT optics need WebGL2, so the signal is shown without them.'
  );
  expect(problems).toEqual([]);
});

test('still renders the signal on a 2D canvas without WebGL2', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  await loadArt(page);

  // Assert
  expect(await canvasWidth(page)).toBeGreaterThan(0);
  expect(problems).toEqual([]);
});
