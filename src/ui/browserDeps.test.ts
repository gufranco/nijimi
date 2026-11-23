import { afterEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';

import { DisplayKind } from '../display/displayKind';
import { browserDeps } from './browserDeps';
import type { AppDeps } from './types';

const original = `${window.location.pathname}${window.location.search}${window.location.hash}`;
const workers: Worker[] = [];

afterEach(() => {
  window.history.replaceState(null, '', original);
  workers.splice(0).forEach((worker) => {
    worker.terminate();
  });
});

const depsFor = (): AppDeps => {
  const deps = browserDeps(window);
  if (deps.worker instanceof Worker) {
    workers.push(deps.worker);
  }
  return deps;
};

describe('browserDeps', () => {
  it('reads the page language list, hash and address', () => {
    // Arrange
    window.history.replaceState(null, '', '#c=rgb');

    // Act
    const deps = depsFor();

    // Assert
    expect(deps.hash).toBe('#c=rgb');
    expect(deps.languages).toEqual(navigator.languages);
    expect(deps.currentUrl()).toBe(window.location.href);
    expect(deps.doc).toBe(document);
  });

  it('writes settings into the hash and clears it for the defaults', () => {
    // Arrange
    const deps = depsFor();

    // Act
    deps.replaceHash('#s=pal-m');
    const written = window.location.hash;
    deps.replaceHash('');

    // Assert
    expect(written).toBe('#s=pal-m');
    expect(window.location.hash).toBe('');
  });

  it('creates a WebGL2 display and a module worker', () => {
    // Arrange
    const deps = depsFor();

    // Act
    const display = deps.createDisplay(document.createElement('canvas'));

    // Assert
    expect(display.kind).toBe(DisplayKind.WebGl2);
    expect(deps.worker).toBeInstanceOf(Worker);
  });

  it('downloads a blob through a temporary link', () => {
    // Arrange
    const deps = depsFor();
    const clicked: string[] = [];
    const listener = (event: MouseEvent): void => {
      const anchor = event.target;
      if (anchor instanceof HTMLAnchorElement) {
        event.preventDefault();
        clicked.splice(clicked.length, 0, `${anchor.download}|${anchor.href.slice(0, 5)}`);
      }
    };
    document.addEventListener('click', listener, true);

    // Act
    deps.download(new Blob(['x'], { type: 'image/png' }), 'shot.png');

    // Assert
    document.removeEventListener('click', listener, true);
    expect(clicked).toEqual(['shot.png|blob:']);
  });

  it('copies text through the clipboard API', async () => {
    // Arrange
    const deps = depsFor();
    await userEvent.click(document.body);

    // Act
    await deps.copyText('nijimi link');

    // Assert
    expect(await navigator.clipboard.readText()).toBe('nijimi link');
  });

  it('reports logged errors to the page as error events', () => {
    // Arrange
    const deps = depsFor();
    const reported: string[] = [];
    const listener = (event: ErrorEvent): void => {
      event.preventDefault();
      reported.splice(
        reported.length,
        0,
        event.error instanceof Error ? event.error.message : event.message
      );
    };
    window.addEventListener('error', listener);

    // Act
    deps.logger.error({ step: 'test' }, 'browserDeps logs this on purpose');

    // Assert
    window.removeEventListener('error', listener);
    expect(reported).toEqual(['browserDeps logs this on purpose {"step":"test"}']);
  });
});
