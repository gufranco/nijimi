import { readFile } from 'node:fs/promises';

import AxeBuilder from '@axe-core/playwright';
import { ALL_FORMATS, BufferSource, Input } from 'mediabunny';
import { chromium, expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { encodeGif } from '../fixtures/encodeGif';
import { encodeApng } from './fixtures/encodePng';
import { recordClip } from './fixtures/recordClip';
import { recordSmsClip } from './fixtures/recordSmsClip';
import { confirmRender, openPage, RENDER_WAIT_MS, waitForRender } from './support';

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

const pickClip = async (
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
  confirm = true
): Promise<void> => {
  await page.locator('#clip-input').setInputFiles(file);
  if (confirm) {
    await confirmRender(page);
  }
};

test('plays an animated GIF at the console field rate', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, { name: 'walk.gif', mimeType: 'image/gif', buffer: GIF });

  // Assert
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz', {
    timeout: RENDER_WAIT_MS
  });
  await waitForRender(page);
  await expect(page.locator('#export-video-button')).toBeVisible({
    visible: await canEncode(page)
  });
  expect(problems).toEqual([]);
});

test('keeps every field of a clip longer than five seconds', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(page, { name: 'long.gif', mimeType: 'image/gif', buffer: LONG_GIF });

  // Assert
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 479 fields at 59.92 Hz', {
    timeout: RENDER_WAIT_MS
  });
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
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz', {
    timeout: RENDER_WAIT_MS
  });
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
  await confirmRender(page);

  // Assert
  await expect(page.locator('#source-info')).toHaveText(
    /^4 x 2 native, Detected 8x scale, \d+ fields at 59\.92 Hz$/,
    { timeout: RENDER_WAIT_MS }
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
    /^(32 x 16 native|4 x 2 native, Detected 8x scale), \d+ fields at 59\.92 Hz$/,
    { timeout: RENDER_WAIT_MS }
  );
  await waitForRender(page);
  expect(problems).toEqual([]);
});

interface ExportedVideo {
  readonly name: string;
  readonly firstFrameLevel: number;
  readonly head: readonly string[];
  readonly video: string | null;
  readonly audio: string | null;
}

const boxes = (bytes: Buffer): readonly string[] =>
  [0, bytes.readUInt32BE(0)].map((offset) => bytes.toString('latin1', offset + 4, offset + 8));

const firstFrameLevel = async (bytes: Buffer): Promise<number> => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    return await page.evaluate(async (data: number[]) => {
      const video = document.createElement('video');
      video.muted = true;
      video.src = URL.createObjectURL(new Blob([new Uint8Array(data)]));
      await new Promise((resolve) => {
        video.addEventListener('loadeddata', resolve, { once: true });
      });
      const seeked = new Promise((resolve) => {
        video.addEventListener('seeked', resolve, { once: true });
      });
      video.currentTime = 0;
      await seeked;
      const canvas = new OffscreenCanvas(video.videoWidth, video.videoHeight);
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0);
      const pixels =
        context?.getImageData(0, 0, canvas.width, canvas.height).data ?? new Uint8ClampedArray(4);
      const total = pixels.reduce((sum, value, index) => (index % 4 === 3 ? sum : sum + value), 0);
      return total / ((pixels.length / 4) * 3);
    }, Array.from(bytes));
  } finally {
    await browser.close();
  }
};

const downloadVideo = async (page: Page): Promise<ExportedVideo> => {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export video' }).click();
  const file = await download;
  const bytes = await readFile(await file.path());
  const media = new Input({ formats: ALL_FORMATS, source: new BufferSource(bytes) });
  return {
    name: file.suggestedFilename(),
    firstFrameLevel: await firstFrameLevel(bytes),
    head: boxes(bytes),
    video: (await (await media.getPrimaryVideoTrack())?.getCodec()) ?? null,
    audio: (await (await media.getPrimaryAudioTrack())?.getCodec()) ?? null
  };
};

const AUDIO_BY_PROJECT: Readonly<Record<string, string>> = {
  chromium: 'opus',
  'mobile-320': 'opus',
  firefox: 'opus',
  webkit: 'aac'
};

const canEncode = (page: Page): Promise<boolean> =>
  page.evaluate(() => typeof VideoEncoder !== 'undefined');

test('exports one loop of a clip as a regular H.264 MP4 whose first frame shows the picture', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  await pickClip(page, { name: 'walk.gif', mimeType: 'image/gif', buffer: GIF });
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz', {
    timeout: RENDER_WAIT_MS
  });
  await waitForRender(page);
  const offered = await page.locator('#export-video-button').isVisible();

  // Act
  const exported = offered ? await downloadVideo(page) : null;

  // Assert
  expect(exported?.firstFrameLevel).toBeGreaterThan(10);
  expect({ ...exported, firstFrameLevel: 0 }).toEqual({
    name: 'nijimi-crt.mp4',
    firstFrameLevel: 0,
    head: ['ftyp', 'moov'],
    video: 'avc',
    audio: null
  });
  expect(problems).toEqual([]);
});

test('checks a compressed Master System video against the console palette, not its compression noise', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, './#p=sms');
  const mp4 = await recordSmsClip();

  // Act
  await pickClip(page, { name: 'sms.mp4', mimeType: 'video/mp4', buffer: mp4 });

  // Assert
  await expect(page.locator('#source-info')).toHaveText(
    /^256 x 192 native, Detected 3x scale, \d+ fields at 59\.92 Hz$/,
    { timeout: RENDER_WAIT_MS }
  );
  await expect(page.locator('#console-check-list li').first()).toHaveText(
    '256x192: a native resolution of this preset.'
  );
  await expect(page.locator('#console-check-list li').nth(1)).toHaveText(
    /^(1[0-6]|[1-9]) colors on screen, within the limit of 32\.$/
  );
  await expect(page.locator('#console-check-list li').last()).toHaveText(
    "Measured on a compressed video, after snapping each color to this console's palette."
  );
  expect(problems).toEqual([]);
});

test('drives a clip from the VCR deck on the TV, with no accessibility violations', async ({
  page
}) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  await pickClip(page, { name: 'walk.gif', mimeType: 'image/gif', buffer: GIF });
  await expect(page.locator('#source-info')).toHaveText('16 x 8 native, 11 fields at 59.92 Hz', {
    timeout: RENDER_WAIT_MS
  });
  await waitForRender(page);
  const deck = page.getByRole('group', { name: 'Video deck' });

  // Act
  await deck.getByRole('button', { name: 'Pause' }).click();
  await deck.getByRole('button', { name: 'One field forward' }).click();
  await deck.getByRole('button', { name: 'Stop and rewind to the start' }).click();
  const seek = deck.getByRole('slider', { name: 'Tape position' });
  await seek.focus();
  await page.keyboard.press('End');
  const atEnd = await seek.inputValue();
  await page.keyboard.press('Home');

  // Assert
  await expect(deck.getByRole('button', { name: 'Play' })).toBeVisible();
  await expect(page.locator('#vcr-counter')).toHaveText('0:00:00');
  expect([atEnd, await seek.inputValue(), await seek.getAttribute('aria-valuetext')]).toEqual([
    '10',
    '0',
    '0:00:00'
  ]);
  const sizes = await deck
    .locator('button, input')
    .evaluateAll((buttons) =>
      buttons.map((button) =>
        Math.min(button.getBoundingClientRect().width, button.getBoundingClientRect().height)
      )
    );
  expect(sizes.every((size) => size >= 44)).toBe(true);
  expect((await new AxeBuilder({ page }).include('#vcr-deck').analyze()).violations).toEqual([]);
  expect(problems).toEqual([]);
});

test('keeps the clip sound as AAC where the browser encodes it, else Opus', async ({
  page
}, info) => {
  // Arrange
  const problems = await openPage(page, GENESIS);
  const webm = await recordClip('video/webm', true);
  await pickClip(page, { name: 'loud.webm', mimeType: 'video/webm', buffer: webm });
  await expect(page.locator('#source-info')).toHaveText(/fields at 59\.92 Hz$/, {
    timeout: RENDER_WAIT_MS
  });
  await waitForRender(page);
  const offered = await page.locator('#export-video-button').isVisible();

  // Act
  const exported = offered ? await downloadVideo(page) : null;

  // Assert
  expect(exported?.firstFrameLevel).toBeGreaterThan(10);
  expect([exported?.name, exported?.head, exported?.video, exported?.audio]).toEqual([
    'nijimi-crt.mp4',
    ['ftyp', 'moov'],
    'avc',
    AUDIO_BY_PROJECT[info.project.name]
  ]);
  expect(problems).toEqual([]);
});

test('refuses a file that is not a clip', async ({ page }) => {
  // Arrange
  const problems = await openPage(page, GENESIS);

  // Act
  await pickClip(
    page,
    {
      name: 'notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not a clip')
    },
    false
  );

  // Assert
  await expect(page.locator('#notice')).toHaveText(
    'This browser cannot decode this clip. Use WebM, MP4, GIF or animated PNG.'
  );
  expect(problems).toEqual([]);
});
