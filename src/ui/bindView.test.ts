import { afterEach, describe, expect, it } from 'vitest';

import { bindView } from './bindView';
import { queryElements } from './queryElements';
import type { Elements } from './queryElements';
import { SHELL_HTML } from './shellHtml';
import type { ViewController } from './bindView';

const mounted: HTMLElement[] = [];

afterEach(() => {
  mounted.splice(0).forEach((root) => {
    root.remove();
  });
});

interface Harness {
  readonly elements: Elements;
  readonly controller: ViewController;
  readonly at: (x: number, y: number) => { readonly clientX: number; readonly clientY: number };
}

const setup = (): Harness => {
  const root = document.createElement('div');
  root.innerHTML = SHELL_HTML;
  document.body.append(root);
  mounted.push(root);
  const elements = queryElements(root);
  elements.screen.style.setProperty('width', '400px');
  elements.screen.style.setProperty('height', '300px');
  const controller = bindView({ elements, doc: document });
  const box = elements.screen.getBoundingClientRect();
  return { elements, controller, at: (x, y) => ({ clientX: box.left + x, clientY: box.top + y }) };
};

const transformOf = (elements: Elements): string =>
  elements.canvasWrap.style.getPropertyValue('transform');

const pointer = (type: string, init: PointerEventInit): PointerEvent =>
  new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId: 1,
    isPrimary: true,
    ...init
  });

describe('bindView', () => {
  it('zooms in twice around a right click and marks the picture as zoomed', () => {
    // Arrange
    const { elements, at } = setup();

    // Act
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 2, ...at(100, 75) }));

    // Assert
    expect(transformOf(elements)).toBe('translate(-100px, -75px) scale(2)');
    expect(elements.zoomReadout.textContent).toBe('2.0x');
    expect(elements.canvasWrap.hasAttribute('data-zoomed')).toBe(true);
  });

  it('zooms out with Shift and a right click', () => {
    // Arrange
    const { elements, at } = setup();
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 2, ...at(100, 75) }));

    // Act
    elements.screen.dispatchEvent(
      pointer('pointerdown', { button: 2, shiftKey: true, ...at(100, 75) })
    );

    // Assert
    expect(elements.zoomReadout.textContent).toBe('1.0x');
    expect(elements.canvasWrap.hasAttribute('data-zoomed')).toBe(false);
  });

  it('pans the zoomed picture while the left button drags', () => {
    // Arrange
    const { elements, at } = setup();
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 2, ...at(200, 150) }));
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 0, ...at(200, 150) }));
    const grabbing = elements.screen.classList.contains('is-panning');

    // Act
    document.dispatchEvent(pointer('pointermove', at(230, 140)));
    document.dispatchEvent(pointer('pointerup', at(230, 140)));

    // Assert
    expect(grabbing).toBe(true);
    expect(transformOf(elements)).toBe('translate(-170px, -160px) scale(2)');
    expect(elements.screen.classList.contains('is-panning')).toBe(false);
  });

  it('ignores moves from a pointer that is not dragging and buttons other than left and right', () => {
    // Arrange
    const { elements, at } = setup();
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 2, ...at(200, 150) }));
    elements.screen.dispatchEvent(pointer('pointerdown', { button: 1, ...at(200, 150) }));

    // Act
    document.dispatchEvent(pointer('pointermove', at(260, 150)));
    document.dispatchEvent(pointer('pointercancel', at(260, 150)));

    // Assert
    expect(transformOf(elements)).toBe('translate(-200px, -150px) scale(2)');
  });

  it('zooms with two pointers pinching apart', () => {
    // Arrange
    const { elements, at } = setup();
    elements.screen.dispatchEvent(
      pointer('pointerdown', { button: 0, pointerId: 1, ...at(150, 150) })
    );
    elements.screen.dispatchEvent(
      pointer('pointerdown', { button: 0, pointerId: 2, ...at(250, 150) })
    );

    // Act
    document.dispatchEvent(pointer('pointermove', { pointerId: 2, ...at(350, 150) }));

    // Assert
    expect(elements.zoomReadout.textContent).toBe('2.0x');
  });

  it('zooms smoothly with the wheel and resets with a double click', () => {
    // Arrange
    const { elements, at } = setup();
    const wheel = new WheelEvent('wheel', {
      deltaY: -500,
      bubbles: true,
      cancelable: true,
      ...at(200, 150)
    });

    // Act
    elements.screen.dispatchEvent(wheel);
    const zoomed = elements.zoomReadout.textContent;
    elements.screen.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    // Assert
    expect(wheel.defaultPrevented).toBe(true);
    expect(zoomed).toBe('2.7x');
    expect(elements.zoomReadout.textContent).toBe('1.0x');
  });

  it('keeps the browser menu off the screen so right clicks can zoom', () => {
    // Arrange
    const { elements } = setup();
    const menu = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });

    // Act
    elements.screen.dispatchEvent(menu);

    // Assert
    expect(menu.defaultPrevented).toBe(true);
  });

  it('answers the zoom and pan keys and leaves other keys alone', () => {
    // Arrange
    const { elements } = setup();
    const press = (key: string): boolean => {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      elements.screen.dispatchEvent(event);
      return event.defaultPrevented;
    };

    // Act
    const handled = [
      '+',
      '+',
      'ArrowRight',
      'ArrowDown',
      'ArrowLeft',
      'ArrowUp',
      '-',
      '=',
      '0',
      'x'
    ].map(press);

    // Assert
    expect(handled).toEqual([true, true, true, true, true, true, true, true, true, false]);
    expect(elements.zoomReadout.textContent).toBe('1.0x');
  });

  it('zooms from the toolbar buttons and resets the view on request', () => {
    // Arrange
    const { elements, controller } = setup();
    elements.zoomInButton.click();
    elements.zoomInButton.click();
    elements.zoomOutButton.click();
    const afterButtons = elements.zoomReadout.textContent;

    // Act
    controller.reset();

    // Assert
    expect(afterButtons).toBe('1.5x');
    expect(elements.zoomReadout.textContent).toBe('1.0x');
    elements.zoomInButton.click();
    elements.resetViewButton.click();
    expect(elements.zoomReadout.textContent).toBe('1.0x');
  });
});
