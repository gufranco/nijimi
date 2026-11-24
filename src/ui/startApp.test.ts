import { afterEach, describe, expect, it } from 'vitest';

import { create2dDisplay } from '../display/create2dDisplay';
import { createDisplay } from '../display/createDisplay';
import { encodeGif } from '../../tests/fixtures/encodeGif';
import { recordWebm } from '../../tests/fixtures/recordWebm';
import { createMemoryStore } from '../clip/createMemoryStore';
import type { FrameStore } from '../clip/types';
import { createLogger } from '../logging/createLogger';
import { startApp } from './startApp';
import { ExportContainer } from './pickExportEncoding';
import type { App, AppDeps } from './types';

const created: { worker: Worker; root: HTMLElement }[] = [];

afterEach(() => {
  created.splice(0).forEach(({ worker, root }) => {
    worker.terminate();
    root.remove();
  });
});

const pngFile = async (
  width: number,
  height: number,
  name = 'art.png',
  type = 'image/png'
): Promise<File> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = '#2244aa';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width / 2, height);
  }
  const blob = await canvas.convertToBlob({ type });
  return new File([blob], name, { type });
};

const gifFile = (delayCentiseconds: number): File =>
  new File(
    [
      encodeGif({
        width: 2,
        height: 1,
        palette: [
          [0, 0, 0],
          [255, 0, 0],
          [0, 0, 255],
          [255, 255, 255]
        ],
        frames: [
          { pixels: [1, 2], delayCentiseconds },
          { pixels: [3, 0], delayCentiseconds }
        ]
      })
    ],
    'walk.gif',
    { type: 'image/gif' }
  );

const choose = (select: HTMLSelectElement, value: string): void => {
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const refusingWorker = (): AppDeps['worker'] => {
  const refusing = new EventTarget();
  return Object.assign(refusing, {
    postMessage: (message: unknown) => {
      const id =
        typeof message === 'object' && message !== null && 'id' in message ? message.id : -1;
      queueMicrotask(() =>
        refusing.dispatchEvent(
          new MessageEvent('message', { data: { id, ok: false, message: 'refused' } })
        )
      );
    }
  });
};

interface Booted {
  readonly app: App;
  readonly root: HTMLDivElement;
  readonly query: <T extends Element>(selector: string, type: abstract new () => T) => T;
  readonly pick: (file: File, inputId?: string, confirm?: boolean) => Promise<void>;
  readonly hashes: string[];
  readonly downloads: string[];
  readonly errors: Error[];
}

const SCHEDULER: AppDeps['scheduler'] = {
  now: () => performance.now(),
  request: (tick) => requestAnimationFrame(tick),
  cancel: (handle) => {
    cancelAnimationFrame(handle);
  }
};

const boot = (overrides: Partial<AppDeps> = {}): Booted => {
  const root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
  const worker = new Worker(new URL('../worker/signal.worker.ts', import.meta.url), {
    type: 'module'
  });
  created.push({ worker, root });
  const hashes: string[] = [];
  const downloads: string[] = [];
  const errors: Error[] = [];
  const deps: AppDeps = {
    doc: document,
    hash: '',
    languages: ['en-US'],
    replaceHash: (hash) => hashes.splice(hashes.length, 0, hash),
    currentUrl: () => 'https://example.test/nijimi/#c=rgb',
    copyText: () => Promise.resolve(),
    worker,
    logger: createLogger((error) => errors.splice(errors.length, 0, error)),
    createDisplay,
    download: (blob, name) => downloads.splice(downloads.length, 0, `${name}:${blob.type}`),
    scheduler: SCHEDULER,
    imageDecoder: ImageDecoder,
    exportEncoding: Promise.resolve({ container: ExportContainer.Webm, video: 'vp9', audio: null }),
    openStore: () => Promise.resolve(createMemoryStore()),
    createWorker: () => {
      const extra = new Worker(new URL('../worker/signal.worker.ts', import.meta.url), {
        type: 'module'
      });
      created.push({ worker: extra, root });
      return extra;
    },
    workerCount: 2,
    ...overrides
  };
  const app = startApp(deps);
  const query = <T extends Element>(selector: string, type: abstract new () => T): T => {
    const element = root.querySelector(selector);
    if (!(element instanceof type)) {
      throw new Error(`${selector} is missing`);
    }
    return element;
  };
  const pick = async (file: File, inputId = '#file-input', confirm = true): Promise<void> => {
    const input = query(inputId, HTMLInputElement);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    Object.defineProperty(input, 'files', { value: transfer.files, configurable: true });
    input.dispatchEvent(new Event('change'));
    await app.idle();
    const dialog = query('#confirm-dialog', HTMLDialogElement);
    if (dialog.open && confirm) {
      const closed = new Promise((resolve) => {
        dialog.addEventListener('close', resolve, { once: true });
      });
      query('#confirm-form', HTMLFormElement).requestSubmit(
        query('#confirm-render', HTMLButtonElement)
      );
      await closed;
      await app.idle();
    }
  };
  return { app, root, query, pick, hashes, downloads, errors };
};

describe('startApp', () => {
  it('shows the empty CRT set in English with the defaults selected', () => {
    // Arrange
    const languages = ['en-GB'];

    // Act
    const page = boot({ languages });

    // Assert
    expect(page.query('#choose-button', HTMLElement).textContent).toBe('Choose PNG');
    expect(page.query('input[name=c]:checked', HTMLInputElement).value).toBe('composite');
    expect(page.query('#export-button', HTMLButtonElement).hidden).toBe(true);
    expect(page.query('#notice', HTMLElement).textContent).toBe('');
  });

  it('speaks Portuguese to a Brazilian browser', () => {
    // Arrange
    const languages = ['pt-BR'];

    // Act
    const page = boot({ languages });

    // Assert
    expect(page.query('#choose-button', HTMLElement).textContent).toBe('Escolher PNG');
    expect(page.query('#language', HTMLSelectElement).value).toBe('pt-BR');
  });

  it('restores a shared link and names the values it ignored', () => {
    // Arrange
    const hash = '#c=svideo&s=pal-m&zoom=9';

    // Act
    const page = boot({ hash });

    // Assert
    expect(page.query('input[name=c]:checked', HTMLInputElement).value).toBe('svideo');
    expect(page.query('select[name=s]', HTMLSelectElement).value).toBe('pal-m');
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'Ignored link values that are not valid: zoom=9'
    );
    expect(page.query('#notice', HTMLElement).getAttribute('data-tone')).toBe('error');
  });

  it('says CRT optics need WebGL2 when only a 2D canvas is available', () => {
    // Arrange
    const fallback = { createDisplay: create2dDisplay };

    // Act
    const page = boot(fallback);

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'CRT optics need WebGL2, so the signal is shown without them.'
    );
  });

  it('renders a picked PNG and reports its native size and scale', async () => {
    // Arrange
    const page = boot();
    const file = await pngFile(64, 32);

    // Act
    await page.pick(file);

    // Assert
    expect(page.query('#crt-canvas', HTMLCanvasElement).width).toBeGreaterThan(0);
    expect(page.query('#empty-state', HTMLElement).hidden).toBe(true);
    expect(page.query('#export-button', HTMLButtonElement).hidden).toBe(false);
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '8 x 4 native, Detected 8x scale'
    );
    expect(page.query('#busy', HTMLElement).hidden).toBe(true);
  });

  it('checks a 320x224 picture against the Genesis H40 preset after loading', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40&x=1' });
    const file = await pngFile(320, 224);

    // Act
    await page.pick(file);

    // Assert
    expect(page.query('#console-check', HTMLElement).hidden).toBe(false);
    expect(
      Array.from(
        page.query('#console-check-list', HTMLElement).children,
        (item) => item.textContent
      )
    ).toEqual([
      '320x224: a native resolution of this preset.',
      '2 colors on screen, within the limit of 61.',
      'Up to 2 levels per color channel, within the 8 of its palette.'
    ]);
  });

  it('rechecks the picture when the console preset changes, without reloading it', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40&x=1' });
    await page.pick(await pngFile(320, 224));
    const preset = page.query('select[name=p]', HTMLSelectElement);
    Array.from(preset.options).forEach((option) => {
      option.toggleAttribute('selected', option.value === 'nes');
    });
    page.query('#controls', HTMLFormElement).reset();

    // Act
    preset.dispatchEvent(new Event('change', { bubbles: true }));

    // Assert
    expect(
      Array.from(page.query('#console-check-list', HTMLElement).children, (item) => [
        item.getAttribute('data-outcome'),
        item.textContent
      ]).slice(0, 2)
    ).toEqual([
      ['fail', '320x224: not a resolution this preset draws.'],
      [
        'fail',
        'Presets that draw this size: Genesis, H40; PlayStation, 320 wide; 32X; Atari 7800, 320 wide; Atari 5200, 320 wide; Nintendo 64, 320 wide; Saturn, 320 wide; Atari Jaguar, 320 wide.'
      ]
    ]);
  });

  it('reports only the native size of art drawn at 1x', async () => {
    // Arrange
    const page = boot();
    const file = await pngFile(7, 5);

    // Act
    await page.pick(file);

    // Assert
    expect(page.query('#source-info', HTMLElement).textContent).toBe('7 x 5 native');
  });

  it('refuses a JPEG with a message and keeps the screen empty', async () => {
    // Arrange
    const page = boot();
    const file = await pngFile(8, 8, 'photo.jpg', 'image/jpeg');

    // Act
    await page.pick(file);

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('Only PNG files are supported.');
    expect(page.query('#empty-state', HTMLElement).hidden).toBe(false);
  });

  it('names the native size of an oversize PNG', async () => {
    // Arrange
    const page = boot();
    const canvas = new OffscreenCanvas(1100, 2);
    canvas.getContext('2d')?.fillRect(0, 0, 1, 1);
    const file = new File([await canvas.convertToBlob({ type: 'image/png' })], 'wide.png', {
      type: 'image/png'
    });

    // Act
    await page.pick(file);

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'This PNG is 1100 x 2 at its native scale. The limit is 1024 x 1024.'
    );
  });

  it('updates the link, the visible controls and the picture when a control changes', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(32, 16));
    const rf = page.query('input[name=c][value=rf]', HTMLInputElement);

    // Act
    rf.click();
    await page.app.idle();

    // Assert
    expect(page.hashes.at(-1)).toBe('#c=rf');
    expect(page.query('#rf-group', HTMLElement).hidden).toBe(false);
  });

  it('shows a range value next to its slider while it moves', () => {
    // Arrange
    const page = boot();
    const bloom = page.query('input[name=b]', HTMLInputElement);
    bloom.setAttribute('value', '0.8');
    page.query('#controls', HTMLFormElement).reset();

    // Act
    bloom.dispatchEvent(new Event('input', { bubbles: true }));

    // Assert
    expect(page.query('#output-b', HTMLElement).textContent).toBe('0.8');
    expect(page.hashes.at(-1)).toBe('#b=0.8');
  });

  it('ignores input from a control that is not a setting', () => {
    // Arrange
    const page = boot();
    const stray = document.createElement('input');
    stray.name = 'nothing';
    page.query('#controls', HTMLElement).append(stray);

    // Act
    stray.dispatchEvent(new Event('input', { bubbles: true }));

    // Assert
    expect(page.hashes).toEqual([]);
  });

  it('reloads the picture at a new source scale', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(64, 32));
    const scale = page.query('select[name=x]', HTMLSelectElement);
    scale.querySelector('option[value="2"]')?.toggleAttribute('selected', true);
    page.query('#controls', HTMLFormElement).reset();

    // Act
    scale.dispatchEvent(new Event('change', { bubbles: true }));
    await page.app.idle();

    // Assert
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '32 x 16 native, Detected 8x scale'
    );
  });

  it('moves every linked screen control when a screen model is chosen', () => {
    // Arrange
    const page = boot();
    const model = page.query('select[name=t]', HTMLSelectElement);
    Array.from(model.options).forEach((option) => {
      option.toggleAttribute('selected', option.value === 'bvm');
    });
    page.query('#controls', HTMLFormElement).reset();

    // Act
    model.dispatchEvent(new Event('change', { bubbles: true }));

    // Assert
    expect([
      page.query('input[name=sl]', HTMLInputElement).value,
      page.query('input[name=b]', HTMLInputElement).value,
      page.query('input[name=cv]', HTMLInputElement).value,
      page.hashes.at(-1)
    ]).toEqual(['1', '0.1', '0', '#t=bvm&sl=1&ms=0.25&b=0.1&cv=0']);
  });

  it('switches the language from the header and keeps it in the link', () => {
    // Arrange
    const page = boot();
    const language = page.query('#language', HTMLSelectElement);
    language.querySelector('option[value="pt-BR"]')?.toggleAttribute('selected', true);
    page.query('#language-form', HTMLFormElement).reset();

    // Act
    language.dispatchEvent(new Event('change', { bubbles: true }));

    // Assert
    expect(page.query('#choose-button', HTMLElement).textContent).toBe('Escolher PNG');
    expect(page.hashes.at(-1)).toBe('#l=pt-BR');
  });

  it('adds and removes a flicker frame', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(32, 16));

    // Act
    await page.pick(await pngFile(32, 16, 'b.png'), '#flicker-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('Flicker frame loaded');
    expect(page.query('#flicker-remove-button', HTMLElement).hidden).toBe(false);
    page.query('#flicker-remove-button', HTMLButtonElement).click();
    await page.app.idle();
    expect(page.query('#flicker-remove-button', HTMLElement).hidden).toBe(true);
  });

  it('shows the original over the CRT at a chosen split', () => {
    // Arrange
    const page = boot();
    const toggle = page.query('#compare-toggle', HTMLInputElement);
    const split = page.query('#compare-split', HTMLInputElement);

    // Act
    toggle.click();
    split.setAttribute('value', '30');
    split.dispatchEvent(new Event('input'));

    // Assert
    expect(page.query('#source-canvas', HTMLElement).hidden).toBe(false);
    expect(page.query('#split-field', HTMLElement).hidden).toBe(false);
    expect(page.query('#canvas-wrap', HTMLElement).style.getPropertyValue('--split')).toBe('30%');
  });

  it('keeps the zoom across setting changes and resets it for a new picture', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(32, 16));
    page.query('#zoom-in-button', HTMLButtonElement).click();
    page.query('input[name=c][value=rgb]', HTMLInputElement).click();
    await page.app.idle();
    const afterSettings = page.query('#zoom-readout', HTMLElement).textContent;

    // Act
    await page.pick(await pngFile(16, 8, 'other.png'));

    // Assert
    expect(afterSettings).toBe('1.5x');
    expect(page.query('#zoom-readout', HTMLElement).textContent).toBe('1.0x');
  });

  it('relabels the full-screen button when full screen changes', () => {
    // Arrange
    const page = boot({ languages: ['pt-BR'] });

    // Act
    document.dispatchEvent(new Event('fullscreenchange'));

    // Assert
    expect(page.query('#fullscreen-button', HTMLElement).textContent).toBe('Tela cheia');
  });

  it('exports the preview as a PNG', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(32, 16));

    // Act
    page.query('#export-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.downloads).toEqual(['nijimi-crt.png:image/png']);
  });

  it('reports a failed export', async () => {
    // Arrange
    const page = boot({
      download: () => {
        throw new Error('disk full');
      }
    });
    await page.pick(await pngFile(32, 16));

    // Act
    page.query('#export-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('The PNG could not be exported.');
    expect(page.errors[0]?.message).toContain('PNG export failed');
  });

  it('copies the link and reports success or failure', async () => {
    // Arrange
    const outcomes = [Promise.resolve(), Promise.reject(new Error('denied'))];
    const page = boot({ copyText: () => outcomes.shift() ?? Promise.resolve() });
    const button = page.query('#copy-link-button', HTMLButtonElement);

    // Act
    button.click();
    await page.app.idle();
    const first = page.query('#notice', HTMLElement).textContent;
    button.click();
    await page.app.idle();

    // Assert
    expect(first).toBe('Link copied');
    expect(page.query('#notice', HTMLElement).textContent).toBe('The link could not be copied.');
  });

  it('reports a render the worker refuses', async () => {
    // Arrange
    const page = boot({ worker: refusingWorker() });

    // Act
    await page.pick(await pngFile(32, 16));
    await page.app.idle();

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'The preview could not be rendered.'
    );
  });

  it('logs a load that fails while reading the file', async () => {
    // Arrange
    const page = boot();
    const file = new File(['x'], 'broken.png', { type: 'image/png' });
    Object.defineProperty(file, 'slice', {
      value: () => ({ arrayBuffer: () => Promise.reject(new Error('read failed')) })
    });

    // Act
    await page.pick(file);

    // Assert
    expect(page.errors[0]?.message).toContain('background task failed');
  });

  it('logs why a corrupt file was refused', async () => {
    // Arrange
    const page = boot();
    const header = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0,
      8, 0, 0, 0, 8
    ]);

    // Act
    await page.pick(new File([header], 'cut.png', { type: 'image/png' }));

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'This file could not be decoded as a PNG.'
    );
    expect(page.errors[0]?.message).toContain('PNG integrity check failed');
  });

  it('keeps the page from navigating when a form is submitted', () => {
    // Arrange
    const page = boot();
    const submit = new Event('submit', { cancelable: true });

    // Act
    page.query('#controls', HTMLElement).dispatchEvent(submit);

    // Assert
    expect(submit.defaultPrevented).toBe(true);
  });

  it('fails fast when the page has no app container', () => {
    // Arrange
    const doc = document.implementation.createHTMLDocument('empty');

    // Act
    const worker = new EventTarget();
    const deps: AppDeps = {
      doc,
      hash: '',
      languages: [],
      replaceHash: () => undefined,
      currentUrl: () => '',
      copyText: () => Promise.resolve(),
      worker: Object.assign(worker, { postMessage: () => undefined }),
      logger: createLogger(() => undefined),
      createDisplay,
      download: () => undefined,
      scheduler: SCHEDULER,
      imageDecoder: undefined,
      exportEncoding: Promise.resolve(null),
      openStore: () => Promise.resolve(createMemoryStore()),
      createWorker: () => Object.assign(new EventTarget(), { postMessage: () => undefined }),
      workerCount: 1
    };
    const start = (): App => startApp(deps);

    // Assert
    expect(start).toThrow('#app container is unavailable');
  });

  it('plays a GIF clip at the console field rate, names its fields and offers a video export', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });

    // Act
    await page.pick(gifFile(10), '#clip-input');

    // Assert
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '2 x 1 native, 11 fields at 59.92 Hz'
    );
    expect(page.query('#export-video-button', HTMLButtonElement).hidden).toBe(false);
    expect(page.query('#export-button', HTMLButtonElement).hidden).toBe(true);
    expect(page.query('#busy', HTMLElement).hidden).toBe(true);
    expect(page.query('#crt-canvas', HTMLCanvasElement).hasAttribute('width')).toBe(true);
    expect(page.query('#notice', HTMLElement).textContent).toBe('');
  });

  it('exports one loop of the clip as a video', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    page.query('#export-video-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.downloads).toEqual(['nijimi-crt.webm:video/webm']);
  });

  it('reports a video export the encoder refuses', async () => {
    // Arrange
    const page = boot({
      hash: '#p=genesis-h40',
      exportEncoding: Promise.resolve({
        container: ExportContainer.Webm,
        video: 'avc',
        audio: null
      })
    });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    page.query('#export-video-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('The video could not be exported.');
    expect(page.errors.map((error) => error.message.split(' {')[0])).toEqual([
      'video export failed'
    ]);
  });

  it('exports no video before a clip is loaded', async () => {
    // Arrange
    const page = boot();

    // Act
    page.query('#export-video-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.downloads).toEqual([]);
  });

  it('hides the video export and encodes nothing when the browser cannot encode video', async () => {
    // Arrange
    const page = boot({ exportEncoding: Promise.resolve(null) });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    page.query('#export-video-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.query('#export-video-button', HTMLButtonElement).hidden).toBe(true);
    expect(page.downloads).toEqual([]);
  });

  it('maps the clip to a new field rate without decoding it again, and decodes it again at a new scale', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    choose(page.query('select[name=s]', HTMLSelectElement), 'pal-bg');
    await page.app.idle();
    const pal = page.query('#source-info', HTMLElement).textContent;
    choose(page.query('select[name=x]', HTMLSelectElement), '2');
    await page.app.idle();

    // Assert
    expect(pal).toBe('2 x 1 native, 9 fields at 49.7 Hz');
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '2 x 1 native, 9 fields at 49.7 Hz'
    );
  });

  it('keeps playing the rendered clip when only the screen changes', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });
    await page.pick(gifFile(10), '#clip-input');
    const bloom = page.query('input[name=b]', HTMLInputElement);

    // Act
    bloom.value = '0.8';
    bloom.dispatchEvent(new Event('input', { bubbles: true }));
    await page.app.idle();

    // Assert
    expect(page.hashes.at(-1)).toContain('b=0.8');
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '2 x 1 native, 11 fields at 59.92 Hz'
    );
  });

  it('keeps the whole of a clip longer than five seconds', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });

    // Act
    await page.pick(gifFile(400), '#clip-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('');
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '2 x 1 native, 479 fields at 59.92 Hz'
    );
  });

  it('logs when the frames of a replaced clip cannot be discarded', async () => {
    // Arrange
    const openStore = (): Promise<FrameStore> => {
      const memory = createMemoryStore();
      return Promise.resolve({
        append: memory.append,
        seal: async (frameBytes) => ({
          ...(await memory.seal(frameBytes)),
          discard: () => Promise.reject(new Error('locked'))
        })
      });
    };
    const page = boot({ openStore });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    await page.pick(await pngFile(64, 32));

    // Assert
    expect(page.errors.map((error) => error.message.split(' {')[0])).toContain(
      'discarding the frames of a replaced clip failed'
    );
  });

  it('refuses a clip the browser cannot decode', async () => {
    // Arrange
    const page = boot();
    const zip = new File([Uint8Array.from([0x50, 0x4b])], 'clip.zip', { type: 'application/zip' });

    // Act
    await page.pick(zip, '#clip-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'This browser cannot decode this clip. Use WebM, MP4, GIF or animated PNG.'
    );
    expect(page.query('#empty-state', HTMLElement).hidden).toBe(false);
  });

  it('replaces a clip with a picked PNG and stops offering the video export', async () => {
    // Arrange
    const page = boot();
    await page.pick(gifFile(10), '#clip-input');

    // Act
    await page.pick(await pngFile(64, 32));

    // Assert
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '8 x 4 native, Detected 8x scale'
    );
    expect(page.query('#export-video-button', HTMLButtonElement).hidden).toBe(true);
    expect(page.query('#export-button', HTMLButtonElement).hidden).toBe(false);
  });

  it('reports a clip the worker refuses to render', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40', worker: refusingWorker() });

    // Act
    await page.pick(gifFile(10), '#clip-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'The preview could not be rendered.'
    );
    expect(page.errors.map((error) => error.message.split(' {')[0])).toEqual([
      'clip render failed'
    ]);
  });

  it('asks to confirm the settings before rendering, rechecks a new scale in the dialog, and renders only on Render', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(64, 32), '#file-input', false);
    const dialog = page.query('#confirm-dialog', HTMLDialogElement);
    const rendered = page.query('#crt-canvas', HTMLCanvasElement).hasAttribute('width');
    const scale = page.query('#confirm-x', HTMLSelectElement);

    // Act
    scale.value = '2';
    scale.dispatchEvent(new Event('change', { bubbles: true }));
    await page.app.idle();
    const info = page.query('#confirm-info', HTMLElement).textContent;
    const closed = new Promise((resolve) => {
      dialog.addEventListener('close', resolve, { once: true });
    });
    page
      .query('#confirm-form', HTMLFormElement)
      .requestSubmit(page.query('#confirm-render', HTMLButtonElement));
    await closed;
    await page.app.idle();

    // Assert
    expect([dialog.open, rendered, info]).toEqual([
      false,
      false,
      '32 x 16 native, Detected 8x scale'
    ]);
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '32 x 16 native, Detected 8x scale'
    );
    expect(page.hashes.at(-1)).toContain('x=2');
  });

  it('refuses a flicker frame that is not a PNG', async () => {
    // Arrange
    const page = boot();
    await page.pick(await pngFile(64, 32));

    // Act
    await page.pick(await pngFile(8, 8, 'photo.jpg', 'image/jpeg'), '#flicker-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('Only PNG files are supported.');
  });

  it('reports a clip whose frames cannot be stored after Render', async () => {
    // Arrange
    const openStore = (): Promise<FrameStore> =>
      Promise.resolve({
        append: () => Promise.reject(new DOMException('no space left', 'QuotaExceededError')),
        seal: () => createMemoryStore().seal(4)
      });
    const page = boot({ openStore });

    // Act
    await page.pick(gifFile(10), '#clip-input');

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe('This clip could not be decoded.');
    expect(page.query('#empty-state', HTMLElement).hidden).toBe(false);
  });

  it('names the size of a clip whose first frame is too large, without opening the dialog', async () => {
    // Arrange
    const page = boot();
    const wide = new File(
      [
        encodeGif({
          width: 4097,
          height: 1,
          palette: [
            [0, 0, 0],
            [255, 0, 0],
            [0, 0, 255],
            [255, 255, 255]
          ],
          frames: [
            { pixels: Array.from({ length: 4097 }, (_, index) => index % 4), delayCentiseconds: 10 }
          ]
        })
      ],
      'wide.gif',
      { type: 'image/gif' }
    );

    // Act
    await page.pick(wide, '#clip-input', false);

    // Assert
    expect(page.query('#confirm-dialog', HTMLDialogElement).open).toBe(false);
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'This clip is 4097 x 1 at its native scale. The limit is 1024 x 1024.'
    );
  });

  it('reports a clip that can no longer be opened when the scale changes', async () => {
    // Arrange
    let opened = 0;
    class OnceDecoder extends ImageDecoder {
      static override isTypeSupported(type: string): Promise<boolean> {
        opened += 1;
        return opened === 1 ? ImageDecoder.isTypeSupported(type) : Promise.resolve(false);
      }
    }
    const page = boot({ imageDecoder: OnceDecoder });
    await page.pick(gifFile(10), '#clip-input');

    // Act
    choose(page.query('select[name=x]', HTMLSelectElement), '2');
    await page.app.idle();

    // Assert
    expect(page.query('#notice', HTMLElement).textContent).toBe(
      'This browser cannot decode this clip. Use WebM, MP4, GIF or animated PNG.'
    );
  });

  it('drives a clip from the deck on the TV', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });
    const idleDisabled = page.query('#vcr-play', HTMLButtonElement).disabled;
    await page.pick(gifFile(10), '#clip-input');
    const play = page.query('#vcr-play', HTMLButtonElement);
    const playingLabel = play.getAttribute('aria-label');

    // Act
    play.click();
    await page.app.idle();
    const pausedLabel = play.getAttribute('aria-label');
    page.query('#vcr-forward', HTMLButtonElement).click();
    page.query('#vcr-fast-forward', HTMLButtonElement).click();
    page.query('#vcr-back', HTMLButtonElement).click();
    page.query('#vcr-rewind', HTMLButtonElement).click();
    await page.app.idle();
    page.query('#vcr-stop', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect([idleDisabled, playingLabel, pausedLabel]).toEqual([true, 'Pause', 'Play']);
    expect(page.query('#vcr-counter', HTMLOutputElement).textContent).toBe('0:00:00');
    expect(page.query('#vcr-deck', HTMLElement).hasAttribute('data-loaded')).toBe(true);
  });

  it('plays a clip with sound and keeps the sound for the video export', async () => {
    // Arrange
    const page = boot({ hash: '#p=genesis-h40' });
    const blob = await recordWebm({
      width: 8,
      height: 8,
      colors: ['#ff0000', '#00ff00', '#0000ff'],
      frameMs: 120,
      audio: true
    });

    // Act
    await page.pick(new File([blob], 'loud.webm', { type: 'video/webm' }), '#clip-input');
    page.query('#export-video-button', HTMLButtonElement).click();
    await page.app.idle();

    // Assert
    expect(page.downloads).toEqual(['nijimi-crt.webm:video/webm']);
    expect(page.errors).toEqual([]);
  });
});
