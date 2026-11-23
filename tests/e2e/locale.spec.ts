import { expect, test } from '@playwright/test';

import { openPage } from './support';

test.use({ locale: 'pt-BR' });

test('speaks Portuguese to a Brazilian browser', async ({ page }) => {
  // Arrange
  const path = './';

  // Act
  const problems = await openPage(page, path);

  // Assert
  await expect(page.getByRole('button', { name: 'Escolher PNG' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  expect(problems).toEqual([]);
});
