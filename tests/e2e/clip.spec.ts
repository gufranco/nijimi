import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { encodeGif } from '../fixtures/encodeGif';
import { encodeApng } from './fixtures/encodePng';
import { recordClip } from './fixtures/recordClip';
import { openPage, waitForRender } from './support';

const GENESIS = './#p=genesis-h40';

const GIF = Buffer.from(
  encodeGif({
    width: 16,
    height: 8,
    palette: [
      [20, 20, 40],
      [230, 60, 60],
      [60, 90, 230],
      [250, 250, 250]
    ],
    frames: [
      { pixels: Array.from({ length: 128 }, (_, index) => 1 + (index % 2)), delayCentiseconds: 10 },
      { pixels: Array.from({ length: 128 }, (_, index) => 3 * (index % 2)), delayCentiseconds: 10 }
    ]
  })
);

const LONG_GIF = Buffer.from(
  encodeGif({
    width: 16,
    height: 8,
    palette: [
      [20, 20, 40],
      [230, 60, 60],
      [60, 90, 230],
      [250, 250, 250]
    ],
    frames: [
      {
        pixels: Array.from({ length: 128 }, (_, index) => 1 + (index % 2)),
        delayCentiseconds: 400
      },
      { pixels: Array.from({ length: 128 }, (_, index) => 3 * (index % 2)), delayCentiseconds: 400 }
    ]
  })
);

const APNG = encodeApng(16, 8, [
  { pixel: (x) => (x % 2 === 0 ? [230, 60, 60] : [60, 90, 230]), delayMs: 100 },
  { pixel: (x) => (x % 2 === 0 ? [250, 250, 250] : [20, 20, 40]), delayMs: 100 }
]);

const canRecord = (page: Page): Promise<boolean> =>
  page.evaluate(() => typeof MediaRecorder !== 'undefined');

const pickClip = async (
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer }
): Promise<void> => {
  await page.locator('#clip-input').setInputFiles(file);
};

test('plays an animated GIF at the console field rate', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, { name: 'walk.gif', mimeType: 'image/gif', buffer: GIF });

  // Assert
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz');
  await waitForRender(page);
  await expect(page.locator('#export-video-button')).toBeVisible({
    visible: await canRecord(page)
  });
  expect(problems).toEqual([]);
});

test('keeps every field of a clip longer than five seconds', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, { name: 'long.gif', mimeType: 'image/gif', buffer: LONG_GIF });

  // Assert
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 479 fields at 59.92 Hz');
  await waitForRender(page);
  await expect(page.locator('#notice')).toHaveText('');
  expect(problems).toEqual([]);
});

test('plays an animated PNG', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, { name: 'walk.png', mimeType: 'image/png', buffer: APNG });

  // Assert
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz');
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('plays a dropped WebM video', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  const bytes = Array.from(await recordClip('video/webm'));
  const transfer = await page.evaluateHandle((data: number[]) => {
    const files = new DataTransfer();
    files.items.add(new File([new Uint8Array(data)], 'clip.webm', { type: 'video/webm' }));
    return files;
  }, bytes);

  // Act
  await page.locator('#screen').dispatchEvent('drop', { dataTransfer: transfer });

  // Assert
  await expect(page.locator('#source-info')).toHaveText(
    /^4 x 2 native, Detected 8x scale, \d+ fields at 59\.92 Hz$/
  );
  await waitForRender(page);
  expect(problems).toEqual([]);
});

test('decodes an MP4 video, whose lossy blocks may or may not read as 8x', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  const mp4 = await recordClip('video/mp4');

  // Act
  await pickClip(page, { name: 'clip.mp4', mimeType: 'video/mp4', buffer: mp4 });

  // Assert
  await expect(page.locator('#source-info')).toHaveText(
    /^(32 x 16 native|4 x 2 native, Detected 8x scale), \d+ fields at 59\.92 Hz$/
  );
  await waitForRender(page);
  expect(problems).toEqual([]);
});

const downloadVideo = async (page: Page): Promise<string> => {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export video' }).click();
  return (await download).suggestedFilename();
};

test('exports one loop of a clip as WebM where the browser can record, and hides the export where it cannot', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  await pickClip(page, { name: 'walk.gif', mimeType: 'image/gif', buffer: GIF });
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz');
  await waitForRender(page);
  const recordable = await canRecord(page);

  // Act
  const name = recordable ? await downloadVideo(page) : null;

  // Assert
  expect(name).toBe(recordable ? 'nijimi-crt.webm' : null);
  await expect(page.locator('#export-video-button')).toBeVisible({ visible: recordable });
  expect(problems).toEqual([]);
});

test('refuses a file that is not a clip', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, {
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a clip')
  });

  // Assert
  await expect(page.locator('#notice')).toHaveText(
    'This browser cannot decode this clip. Use WebM, MP4, GIF or animated PNG.'
  );
  expect(problems).toEqual([]);
});
