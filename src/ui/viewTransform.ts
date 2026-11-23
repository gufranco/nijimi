export interface ViewState {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

const MIN_SCALE = 1;
const MAX_SCALE = 16;

const clamp = (value: number, low: number, high: number): number =>
  Math.min(high, Math.max(low, value));

const constrain = (view: ViewState, viewport: Size): ViewState => {
  const scale = clamp(view.scale, MIN_SCALE, MAX_SCALE);
  return {
    scale,
    x: clamp(view.x, viewport.width - viewport.width * scale, 0) + 0,
    y: clamp(view.y, viewport.height - viewport.height * scale, 0) + 0
  };
};

const zoomAt = (view: ViewState, viewport: Size, point: Point, factor: number): ViewState => {
  const scale = clamp(view.scale * factor, MIN_SCALE, MAX_SCALE);
  const ratio = scale / view.scale;
  return constrain(
    { scale, x: point.x - (point.x - view.x) * ratio, y: point.y - (point.y - view.y) * ratio },
    viewport
  );
};

const panBy = (view: ViewState, viewport: Size, dx: number, dy: number): ViewState =>
  constrain({ scale: view.scale, x: view.x + dx, y: view.y + dy }, viewport);

const toCss = (view: ViewState): string =>
  `translate(${String(view.x)}px, ${String(view.y)}px) scale(${String(view.scale)})`;

export const VIEW = {
  identity: { scale: MIN_SCALE, x: 0, y: 0 } satisfies ViewState,
  zoomAt,
  panBy,
  toCss
} as const;
