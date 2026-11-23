import { expect, test } from '@playwright/test';

import { openPage } from './support';

test.use({ locale: 'ja-JP' });

test('speaks Japanese to a Japanese browser', async ({ page }) => {
  // Arrange
  const path = './';

  // Act
  const problems = await openPage(page, path);

  // Assert
  await expect(page.getByRole('button', { name: 'PNGを選択' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  expect(problems).toEqual([]);
});
