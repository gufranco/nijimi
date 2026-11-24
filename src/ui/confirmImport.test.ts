import { afterEach, describe, expect, it } from 'vitest';

import { Locale } from '../i18n/locale';
import type { ClipSource, RgbaImage } from '../input/types';
import { createLogger } from '../logging/createLogger';
import { DEFAULT_SETTINGS } from '../settings/defaultSettings';
import { ConsolePreset } from '../signal/consolePreset';
import { applyTranslations } from './applyTranslations';
import { createConfirmImport } from './confirmImport';
import type { ConfirmedImport, ConfirmImport } from './confirmImport';
import { queryElements } from './queryElements';
import type { Elements } from './queryElements';
import { SHELL_HTML } from './shellHtml';

const roots: HTMLElement[] = [];

afterEach(() => {
  roots.splice(0).forEach((root) => {
    root.remove();
  });
});

const pngOf = async (width: number, height: number): Promise<Blob> => {
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d');
  if (context !== null) {
    context.fillStyle = '#3366cc';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#ffcc00';
    context.fillRect(0, 0, width / 2, height / 2);
  }
  return canvas.convertToBlob({ type: 'image/png' });
};

const solid = (width: number, height: number): RgbaImage => ({
  width,
  height,
  data: Uint8ClampedArray.from({ length: width * height * 4 }, (_, index) =>
    index % 4 === 3 ? 255 : 120
  )
});

interface FakeClip {
  readonly source: ClipSource;
  readonly offered: number[];
  readonly closed: string[];
}

const fakeClip = (frames: readonly RgbaImage[]): FakeClip => {
  const offered: number[] = [];
  const closed: string[] = [];
  let call = 0;
  return {
    offered,
    closed,
    source: {
      lossy: false,
      each: async (visit) => {
        const frame = frames[Math.min(call, frames.length - 1)] ?? solid(1, 1);
        call += 1;
        offered.splice(offered.length, 0, call);
        await visit(frame, 0);
        return 0;
      },
      close: () => {
        closed.splice(closed.length, 0, 'closed');
      }
    }
  };
};

interface Harness {
  readonly elements: Elements;
  readonly confirm: ConfirmImport;
  readonly chosen: ConfirmedImport[];
  readonly settle: () => Promise<void>;
}

const harness = (): Harness => {
  const root = document.createElement('div');
  root.innerHTML = SHELL_HTML;
  document.body.append(root);
  roots.splice(roots.length, 0, root);
  applyTranslations(document, Locale.En);
  const elements = queryElements(root);
  const chosen: ConfirmedImport[] = [];
  let pending: Promise<unknown> = Promise.resolve();
  const confirm = createConfirmImport({
    elements,
    logger: createLogger(() => undefined),
    locale: () => Locale.En,
    track: (work) => {
      pending = Promise.all([pending, work]);
    },
    onRender: (choice) => chosen.splice(chosen.length, 0, choice)
  });
  return { elements, confirm, chosen, settle: () => pending.then(() => undefined) };
};

const choose = (elements: Elements, name: string, value: string): void => {
  const select = elements.confirmForm.querySelector(`select[name="${name}"]`);
  if (select instanceof HTMLSelectElement) {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
};

const closing = (elements: Elements): Promise<unknown> =>
  new Promise((resolve) => {
    elements.confirmDialog.addEventListener('close', resolve, { once: true });
  });

const checkLines = (elements: Elements): readonly string[] =>
  Array.from(elements.confirmCheck.children, (item) => item.textContent);

describe('createConfirmImport', () => {
  it('shows a picked PNG with its size and check, and renders nothing until Render is pressed', async () => {
    // Arrange
    const { elements, confirm, chosen } = harness();
    const blob = await pngOf(64, 32);

    // Act
    const result = await confirm.open({ kind: 'image', blob }, DEFAULT_SETTINGS);

    // Assert
    expect(result.ok).toBe(true);
    expect(elements.confirmDialog.open).toBe(true);
    expect(elements.confirmInfo.textContent).toBe('8 x 4 native, Detected 8x scale');
    expect(elements.confirmCanvas.getAttribute('width')).toBe('8');
    expect(checkLines(elements).length).toBeGreaterThan(0);
    expect(chosen).toEqual([]);
  });

  it('hands the picture and the settings chosen in the dialog over on Render', async () => {
    // Arrange
    const { elements, confirm, chosen } = harness();
    await confirm.open({ kind: 'image', blob: await pngOf(64, 32) }, DEFAULT_SETTINGS);
    choose(elements, 'c', 'rgb');
    const closed = closing(elements);

    // Act
    elements.confirmForm.requestSubmit(elements.confirmForm.querySelector('#confirm-render'));
    await closed;

    // Assert
    expect(elements.confirmDialog.open).toBe(false);
    expect(chosen.map((choice) => [choice.kind, choice.settings.signal.connection])).toEqual([
      ['image', 'rgb']
    ]);
  });

  it('reloads the preview at a new scale and rechecks a new console without reloading', async () => {
    // Arrange
    const { elements, confirm, settle } = harness();
    await confirm.open({ kind: 'image', blob: await pngOf(64, 32) }, DEFAULT_SETTINGS);
    const before = checkLines(elements).join('|');

    // Act
    choose(elements, 'x', '2');
    await settle();
    const scaled = elements.confirmInfo.textContent;
    choose(elements, 'p', ConsolePreset.MasterSystem);

    // Assert
    expect(scaled).toBe('32 x 16 native, Detected 8x scale');
    expect(checkLines(elements).join('|')).not.toBe(before);
  });

  it('ignores a change from a control that is not a setting, and changes while closed', async () => {
    // Arrange
    const { elements, confirm } = harness();
    elements.confirmForm.dispatchEvent(new Event('change', { bubbles: true }));
    await confirm.open({ kind: 'image', blob: await pngOf(64, 32) }, DEFAULT_SETTINGS);
    const info = elements.confirmInfo.textContent;

    // Act
    elements.confirmCancel.dispatchEvent(new Event('change', { bubbles: true }));

    // Assert
    expect(elements.confirmInfo.textContent).toBe(info);
  });

  it('closes on Cancel without rendering, and releases a pending clip', async () => {
    // Arrange
    const { elements, confirm, chosen } = harness();
    const clip = fakeClip([solid(8, 8)]);
    await confirm.open({ kind: 'clip', blob: new Blob([]), source: clip.source }, DEFAULT_SETTINGS);
    const closed = closing(elements);

    // Act
    elements.confirmCancel.click();
    await closed;

    // Assert
    expect(elements.confirmDialog.open).toBe(false);
    expect(chosen).toEqual([]);
    expect(clip.closed).toEqual(['closed']);
  });

  it('reads only the first frame of a clip, again when the console changes, and hands the clip over', async () => {
    // Arrange
    const { elements, confirm, chosen, settle } = harness();
    const clip = fakeClip([solid(8, 8)]);
    await confirm.open({ kind: 'clip', blob: new Blob([]), source: clip.source }, DEFAULT_SETTINGS);

    // Act
    choose(elements, 'p', ConsolePreset.MasterSystem);
    await settle();
    const closed = closing(elements);
    elements.confirmForm.requestSubmit(elements.confirmForm.querySelector('#confirm-render'));
    await closed;

    // Assert
    expect(clip.offered).toEqual([1, 2]);
    expect(chosen.map((choice) => [choice.kind, choice.settings.signal.preset])).toEqual([
      ['clip', ConsolePreset.MasterSystem]
    ]);
    expect(clip.closed).toEqual([]);
  });

  it('keeps the previous preview when the reloaded first frame is refused', async () => {
    // Arrange
    const { elements, confirm, settle } = harness();
    const clip = fakeClip([solid(8, 8), solid(4097, 1)]);
    await confirm.open({ kind: 'clip', blob: new Blob([]), source: clip.source }, DEFAULT_SETTINGS);

    // Act
    choose(elements, 'x', '1');
    await settle();

    // Assert
    expect(elements.confirmInfo.textContent).toBe('1 x 1 native, Detected 8x scale');
  });

  it('refuses a file it cannot preview without opening, and releases the clip', async () => {
    // Arrange
    const { elements, confirm } = harness();
    const clip = fakeClip([solid(4097, 1)]);

    // Act
    const result = await confirm.open(
      { kind: 'clip', blob: new Blob([]), source: clip.source },
      DEFAULT_SETTINGS
    );

    // Assert
    expect(result.ok).toBe(false);
    expect(elements.confirmDialog.open).toBe(false);
    expect(clip.closed).toEqual(['closed']);
  });

  it('redraws the open dialog on refresh and does nothing when closed', async () => {
    // Arrange
    const { elements, confirm } = harness();
    confirm.refresh();
    await confirm.open({ kind: 'image', blob: await pngOf(64, 32) }, DEFAULT_SETTINGS);
    elements.confirmInfo.replaceChildren('');

    // Act
    confirm.refresh();

    // Assert
    expect(elements.confirmInfo.textContent).toBe('8 x 4 native, Detected 8x scale');
  });

  it('reloads a clip preview for a new standard but not for a new connection', async () => {
    // Arrange
    const { elements, confirm, settle } = harness();
    const clip = fakeClip([solid(8, 8)]);
    await confirm.open({ kind: 'clip', blob: new Blob([]), source: clip.source }, DEFAULT_SETTINGS);

    // Act
    choose(elements, 's', 'pal-bg');
    await settle();
    choose(elements, 'c', 'rgb');
    await settle();

    // Assert
    expect(clip.offered).toEqual([1, 2]);
  });

  it('cancels a picture without rendering and stops redrawing once closed', async () => {
    // Arrange
    const { elements, confirm, chosen } = harness();
    await confirm.open({ kind: 'image', blob: await pngOf(64, 32) }, DEFAULT_SETTINGS);
    const closed = closing(elements);
    elements.confirmCancel.click();
    await closed;
    elements.confirmInfo.replaceChildren('');

    // Act
    confirm.refresh();

    // Assert
    expect([chosen, elements.confirmInfo.textContent]).toEqual([[], '']);
  });
});
