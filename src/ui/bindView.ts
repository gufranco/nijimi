import type { Elements } from './queryElements';
import { VIEW } from './viewTransform';
import type { Point, Size, ViewState } from './viewTransform';

const CLICK_ZOOM = 2;
const STEP_ZOOM = 1.5;
const WHEEL_SENSITIVITY = 0.002;
const KEY_PAN_FRACTION = 0.1;
const MIN_PINCH_DISTANCE = 1;

export interface ViewController {
  readonly reset: () => void;
}

interface View {
  readonly zoom: (point: Point, factor: number) => void;
  readonly pan: (dx: number, dy: number) => void;
  readonly reset: () => void;
  readonly viewport: () => Size;
}

const createView = (elements: Elements): View => {
  let state: ViewState = VIEW.identity;
  const viewport = (): Size => ({
    width: elements.screen.clientWidth,
    height: elements.screen.clientHeight
  });
  const show = (next: ViewState): void => {
    state = next;
    elements.canvasWrap.style.setProperty('transform', VIEW.toCss(next));
    elements.canvasWrap.toggleAttribute('data-zoomed', next.scale > 1);
    elements.zoomReadout.replaceChildren(`${next.scale.toFixed(1)}x`);
  };
  return {
    zoom: (point, factor) => {
      show(VIEW.zoomAt(state, viewport(), point, factor));
    },
    pan: (dx, dy) => {
      show(VIEW.panBy(state, viewport(), dx, dy));
    },
    reset: () => {
      show(VIEW.identity);
    },
    viewport
  };
};

const localPoint = (screen: HTMLElement, event: MouseEvent): Point => {
  const box = screen.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
};

const centreOf = (view: View): Point => ({
  x: view.viewport().width / 2,
  y: view.viewport().height / 2
});

const moveWith = (
  view: View,
  pointers: ReadonlyMap<number, Point>,
  id: number,
  last: Point,
  current: Point
): void => {
  const other = [...pointers].find(([key]) => key !== id)?.[1];
  if (other === undefined) {
    view.pan(current.x - last.x, current.y - last.y);
    return;
  }
  const before = Math.max(MIN_PINCH_DISTANCE, Math.hypot(last.x - other.x, last.y - other.y));
  const after = Math.hypot(current.x - other.x, current.y - other.y);
  view.zoom({ x: (current.x + other.x) / 2, y: (current.y + other.y) / 2 }, after / before);
};

const bindPointers = (screen: HTMLElement, doc: Document, view: View): void => {
  let pointers: ReadonlyMap<number, Point> = new Map();
  screen.addEventListener('pointerdown', (event) => {
    if (event.button === 2) {
      event.preventDefault();
      view.zoom(localPoint(screen, event), event.shiftKey ? 1 / CLICK_ZOOM : CLICK_ZOOM);
      return;
    }
    if (event.button === 0) {
      pointers = new Map([...pointers, [event.pointerId, localPoint(screen, event)]]);
      screen.classList.add('is-panning');
    }
  });
  doc.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId);
    if (last === undefined) {
      return;
    }
    const current = localPoint(screen, event);
    moveWith(view, pointers, event.pointerId, last, current);
    pointers = new Map([...pointers, [event.pointerId, current]]);
  });
  const release = (event: PointerEvent): void => {
    pointers = new Map([...pointers].filter(([id]) => id !== event.pointerId));
    screen.classList.toggle('is-panning', pointers.size > 0);
  };
  doc.addEventListener('pointerup', release);
  doc.addEventListener('pointercancel', release);
};

const keyActions = (view: View): Readonly<Record<string, () => void>> => {
  const zoomBy = (factor: number) => (): void => {
    view.zoom(centreOf(view), factor);
  };
  const panBy = (fx: number, fy: number) => (): void => {
    view.pan(
      view.viewport().width * KEY_PAN_FRACTION * fx,
      view.viewport().height * KEY_PAN_FRACTION * fy
    );
  };
  return {
    '+': zoomBy(STEP_ZOOM),
    '=': zoomBy(STEP_ZOOM),
    '-': zoomBy(1 / STEP_ZOOM),
    '0': () => {
      view.reset();
    },
    ArrowLeft: panBy(1, 0),
    ArrowRight: panBy(-1, 0),
    ArrowUp: panBy(0, 1),
    ArrowDown: panBy(0, -1)
  };
};

const bindScreen = (screen: HTMLElement, view: View): void => {
  const actions = keyActions(view);
  screen.addEventListener('wheel', (event) => {
    event.preventDefault();
    view.zoom(localPoint(screen, event), Math.exp(-event.deltaY * WHEEL_SENSITIVITY));
  });
  screen.addEventListener('dblclick', () => {
    view.reset();
  });
  screen.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
  screen.addEventListener('keydown', (event) => {
    const action = Object.hasOwn(actions, event.key) ? actions[event.key] : undefined;
    if (action !== undefined) {
      event.preventDefault();
      action();
    }
  });
};

export const bindView = (input: {
  readonly elements: Elements;
  readonly doc: Document;
}): ViewController => {
  const view = createView(input.elements);
  bindPointers(input.elements.screen, input.doc, view);
  bindScreen(input.elements.screen, view);
  input.elements.zoomInButton.addEventListener('click', () => {
    view.zoom(centreOf(view), STEP_ZOOM);
  });
  input.elements.zoomOutButton.addEventListener('click', () => {
    view.zoom(centreOf(view), 1 / STEP_ZOOM);
  });
  input.elements.resetViewButton.addEventListener('click', () => {
    view.reset();
  });
  return { reset: view.reset };
};
