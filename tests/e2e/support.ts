import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

import { encodePng } from './fixtures/encodePng';

export const ART = encodePng(64, 48, (x, y) => {
  if (y > 30) {
    return x % 2 === 0 ? [40, 80, 220] : [240, 240, 255];
  }
  return [(x * 4) % 256, (y * 5) % 256, 120];
});

export const PNG_FILE = { name: 'waterfall.png', mimeType: 'image/png', buffer: ART };

const BROWSER_DIAGNOSTICS = [
  /GL Driver Message \(OpenGL, Performance/,
  /Failed to create WebGL context/,
  /The execution of microtasks on this page was reordered to avoid unsafe execution/
];

const isBrowserDiagnostic = (text: string): boolean =>
  BROWSER_DIAGNOSTICS.some((pattern) => pattern.test(text));

const RENDER_WAIT_MS = 30_000;

export const openPage = async (page: Page, path = './'): Promise<string[]> => {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    const text = message.text();
    if (
      (message.type() === 'error' || message.type() === 'warning') &&
      !isBrowserDiagnostic(text)
    ) {
      problems.push(text);
    }
  });
  await page.goto(path);
  return problems;
};

export const canvasWidth = (page: Page): Promise<number> =>
  page.locator('#crt-canvas').evaluate((canvas: HTMLCanvasElement) => canvas.width);

export const waitForRender = async (page: Page): Promise<void> => {
  await expect(page.locator('#source-info')).not.toHaveText('');
  await expect(page.locator('#busy')).toBeHidden({ timeout: RENDER_WAIT_MS });
  await expect.poll(() => canvasWidth(page)).toBeGreaterThan(0);
};

export const confirmRender = async (page: Page): Promise<void> => {
  await page.locator('#confirm-render').click();
};

export const loadArt = async (page: Page): Promise<void> => {
  await page.locator('#file-input').setInputFiles(PNG_FILE);
  await confirmRender(page);
  await waitForRender(page);
};
