import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

import { decodePng } from './fixtures/decodePng';
import { encodePng } from './fixtures/encodePng';
import { confirmRender, loadArt, openPage, waitForRender } from './support';

const WHITE = encodePng(32, 24, () => [255, 255, 255]);
const LARGE = encodePng(320, 240, (x, y) => [(x * 7) % 256, (y * 5) % 256, ((x + y) * 3) % 256]);

const relativeLuminance = (rgb: readonly number[]): number => {
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
};

const contrast = (a: readonly number[], b: readonly number[]): number => {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].toSorted((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
};

const BACKGROUND = [0x1a, 0x1b, 0x26];

test('renders the picture and counts its colors in the one signal worker', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);

  // Act
  await loadArt(page);

  // Assert
  await expect(page.locator('#console-check-list li').first()).toHaveText(
    '64x48: not a resolution this preset draws.'
  );
  const scripts = page.workers().map((worker) => worker.url());
  expect(scripts).toHaveLength(1);
  expect(scripts[0]).toContain('signal.worker');
  expect(problems).toEqual([]);
});

test('exports an aperture grille in red, green and blue stripes 3 pixels apart wherever WebGL2 runs', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, './#c=rgb&m=aperture-grille&ms=1&sl=0&b=0&cv=0');
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
  const y = Math.floor(image.height / 2);
  const x = Math.floor(image.width / 2);
  const dominant = Array.from({ length: 6 }, (_, offset) => {
    const rgb = image.pixel(x + offset, y);
    return rgb.indexOf(Math.max(...rgb));
  });
  const stripes =
    new Set(dominant.slice(0, 3)).size === 3 &&
    dominant.slice(0, 3).join() === dominant.slice(3).join();
  expect(stripes).toBe(webgl);
  expect(problems).toEqual([]);
});

test('redraws a mask change on the screen alone, without rerunning the signal', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page);
  await page.locator('#file-input').setInputFiles({
    name: 'large.png',
    mimeType: 'image/png',
    buffer: LARGE
  });
  await confirmRender(page);
  await waitForRender(page);
  await page.evaluate(() => {
    const busy = document.querySelector('#busy');
    const seen = { busy: false };
    Object.defineProperty(window, 'busySeen', { value: seen });
    new MutationObserver(() => {
      seen.busy = seen.busy || busy?.hasAttribute('hidden') === false;
    }).observe(busy ?? document.body, { attributes: true });
  });

  // Act
  await page.locator('#controls select[name=m]').selectOption('slot-mask');

  // Assert
  await expect(page).toHaveURL(/m=slot-mask/);
  const elapsed = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const start = performance.now();
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(performance.now() - start);
          });
        });
      })
  );
  test.info().annotations.push({ type: 'redraw frame pair ms', description: elapsed.toFixed(1) });
  expect(
    await page.evaluate(() => (window as unknown as { busySeen: { busy: boolean } }).busySeen.busy)
  ).toBe(false);
  expect(problems).toEqual([]);
});

test('keeps text at 4.5:1 and the focus ring at 3:1 against the page', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await page.getByRole('button', { name: 'Choose PNG' }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');

  // Act
  const colours = await page.evaluate(() => {
    const rgb = (value: string): number[] =>
      (value.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const style = (selector: string): CSSStyleDeclaration | null => {
      const element = document.querySelector(selector);
      return element === null ? null : getComputedStyle(element);
    };
    return {
      text: rgb(style('body')?.color ?? ''),
      muted: rgb(style('.tagline')?.color ?? ''),
      label: rgb(style('.field-label')?.color ?? ''),
      focus: rgb(style('#choose-button')?.outlineColor ?? ''),
      focusWidth: Number.parseFloat(style('#choose-button')?.outlineWidth ?? '0')
    };
  });

  // Assert
  expect(contrast(colours.text, BACKGROUND)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colours.muted, BACKGROUND)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colours.label, BACKGROUND)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colours.focus, BACKGROUND)).toBeGreaterThanOrEqual(3);
  expect(colours.focusWidth).toBeGreaterThanOrEqual(2);
  expect(problems).toEqual([]);
});

test('has no accessibility violations while it shows an error', async ({ page }) => {
  // Arrange
  const problems = await openPage(page);
  await page.locator('#file-input').setInputFiles({
    name: 'photo.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff])
  });
  await expect(page.locator('#notice')).toHaveText('Only PNG files are supported.');

  // Act
  const results = await new AxeBuilder({ page }).analyze();

  // Assert
  expect(results.violations).toEqual([]);
  expect(problems).toEqual([]);
});
