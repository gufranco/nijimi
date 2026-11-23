import { expect, test } from '@playwright/test';

import { openPage } from './support';

test.use({ reducedMotion: 'reduce' });

test('keeps the neon still when the visitor asks for reduced motion', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  const animation = await page
    .locator('.brand')
    .evaluate((element) => getComputedStyle(element).animationName);

  // Assert
  expect(animation).toBe('none');
  expect(problems).toEqual([]);
});
