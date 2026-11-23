import { afterEach, describe, expect, it } from 'vitest';

import { create2dDisplay } from '../display/create2dDisplay';
import { createDisplay } from '../display/createDisplay';
import { createLogger } from '../logging/createLogger';
import { startApp } from './startApp';
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

interface Booted {
  readonly app: App;
  readonly root: HTMLDivElement;
  readonly query: <T extends Element>(selector: string, type: abstract new () => T) => T;
  readonly pick: (file: File, inputId?: string) => Promise<void>;
  readonly hashes: string[];
  readonly downloads: string[];
  readonly errors: Error[];
}

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
  const pick = async (file: File, inputId = '#file-input'): Promise<void> => {
    const input = query(inputId, HTMLInputElement);
    const transfer = new DataTransfer();
    transfer.items.add(file);
    Object.defineProperty(input, 'files', { value: transfer.files, configurable: true });
    input.dispatchEvent(new Event('change'));
    await app.idle();
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
    expect(page.query('#export-button', HTMLButtonElement).disabled).toBe(true);
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
    expect(page.query('#export-button', HTMLButtonElement).disabled).toBe(false);
    expect(page.query('#source-info', HTMLElement).textContent).toBe(
      '8 x 4 native, Detected 8x scale'
    );
    expect(page.query('#busy', HTMLElement).hidden).toBe(true);
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

  it('shows the original beside the CRT and zooms the screen', () => {
    // Arrange
    const page = boot();
    const toggle = page.query('#compare-toggle', HTMLInputElement);
    const split = page.query('#compare-split', HTMLInputElement);

    // Act
    toggle.click();
    split.setAttribute('value', '30');
    split.dispatchEvent(new Event('input'));
    page.query('input[name=zoom][value="4"]', HTMLInputElement).click();

    // Assert
    expect(page.query('#source-canvas', HTMLElement).hidden).toBe(false);
    expect(page.query('#split-field', HTMLElement).hidden).toBe(false);
    expect(page.query('#canvas-wrap', HTMLElement).style.getPropertyValue('--split')).toBe('30%');
    expect(page.query('#canvas-wrap', HTMLElement).getAttribute('data-zoom')).toBe('4');
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
    const refusing = new EventTarget();
    const worker = Object.assign(refusing, {
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
    const page = boot({ worker });

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
      download: () => undefined
    };
    const start = (): App => startApp(deps);

    // Assert
    expect(start).toThrow('#app container is unavailable');
  });
});
