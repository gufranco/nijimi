type Constructor<T extends Element> = abstract new () => T;

const byId = <T extends Element>(root: ParentNode, id: string, type: Constructor<T>): T => {
  const element = root.querySelector(`#${id}`);
  if (!(element instanceof type)) {
    throw new Error(`#${id} is missing or is not a ${type.name}`);
  }
  return element;
};

export interface Elements {
  readonly form: HTMLFormElement;
  readonly languageForm: HTMLFormElement;
  readonly language: HTMLSelectElement;
  readonly screen: HTMLElement;
  readonly canvasWrap: HTMLElement;
  readonly crtCanvas: HTMLCanvasElement;
  readonly sourceCanvas: HTMLCanvasElement;
  readonly emptyState: HTMLElement;
  readonly busy: HTMLElement;
  readonly chooseButton: HTMLButtonElement;
  readonly compareToggle: HTMLInputElement;
  readonly splitField: HTMLElement;
  readonly compareSplit: HTMLInputElement;
  readonly exportButton: HTMLButtonElement;
  readonly copyLinkButton: HTMLButtonElement;
  readonly notice: HTMLElement;
  readonly sourceInfo: HTMLElement;
  readonly customTiming: HTMLElement;
  readonly separationField: HTMLElement;
  readonly palField: HTMLElement;
  readonly hueField: HTMLElement;
  readonly saturationField: HTMLElement;
  readonly rfGroup: HTMLElement;
  readonly frameField: HTMLElement;
  readonly frameIndex: HTMLInputElement;
  readonly flickerButton: HTMLButtonElement;
  readonly flickerRemoveButton: HTMLButtonElement;
  readonly fileInput: HTMLInputElement;
  readonly flickerInput: HTMLInputElement;
}

export const queryElements = (root: ParentNode): Elements => ({
  form: byId(root, 'controls', HTMLFormElement),
  languageForm: byId(root, 'language-form', HTMLFormElement),
  language: byId(root, 'language', HTMLSelectElement),
  screen: byId(root, 'screen', HTMLElement),
  canvasWrap: byId(root, 'canvas-wrap', HTMLElement),
  crtCanvas: byId(root, 'crt-canvas', HTMLCanvasElement),
  sourceCanvas: byId(root, 'source-canvas', HTMLCanvasElement),
  emptyState: byId(root, 'empty-state', HTMLElement),
  busy: byId(root, 'busy', HTMLElement),
  chooseButton: byId(root, 'choose-button', HTMLButtonElement),
  compareToggle: byId(root, 'compare-toggle', HTMLInputElement),
  splitField: byId(root, 'split-field', HTMLElement),
  compareSplit: byId(root, 'compare-split', HTMLInputElement),
  exportButton: byId(root, 'export-button', HTMLButtonElement),
  copyLinkButton: byId(root, 'copy-link-button', HTMLButtonElement),
  notice: byId(root, 'notice', HTMLElement),
  sourceInfo: byId(root, 'source-info', HTMLElement),
  customTiming: byId(root, 'custom-timing', HTMLElement),
  separationField: byId(root, 'separation-field', HTMLElement),
  palField: byId(root, 'pal-field', HTMLElement),
  hueField: byId(root, 'hue-field', HTMLElement),
  saturationField: byId(root, 'saturation-field', HTMLElement),
  rfGroup: byId(root, 'rf-group', HTMLElement),
  frameField: byId(root, 'frame-field', HTMLElement),
  frameIndex: byId(root, 'control-f', HTMLInputElement),
  flickerButton: byId(root, 'flicker-button', HTMLButtonElement),
  flickerRemoveButton: byId(root, 'flicker-remove-button', HTMLButtonElement),
  fileInput: byId(root, 'file-input', HTMLInputElement),
  flickerInput: byId(root, 'flicker-input', HTMLInputElement)
});
