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
  readonly tv: HTMLElement;
  readonly screen: HTMLElement;
  readonly canvasWrap: HTMLElement;
  readonly crtCanvas: HTMLCanvasElement;
  readonly sourceCanvas: HTMLCanvasElement;
  readonly emptyState: HTMLElement;
  readonly busy: HTMLElement;
  readonly chooseButton: HTMLButtonElement;
  readonly clipButton: HTMLButtonElement;
  readonly busyProgress: HTMLElement;
  readonly exportVideoButton: HTMLButtonElement;
  readonly compareToggle: HTMLInputElement;
  readonly splitField: HTMLElement;
  readonly compareSplit: HTMLInputElement;
  readonly exportButton: HTMLButtonElement;
  readonly copyLinkButton: HTMLButtonElement;
  readonly zoomInButton: HTMLButtonElement;
  readonly zoomOutButton: HTMLButtonElement;
  readonly zoomReadout: HTMLOutputElement;
  readonly resetViewButton: HTMLButtonElement;
  readonly fullscreenButton: HTMLButtonElement;
  readonly notice: HTMLElement;
  readonly sourceInfo: HTMLElement;
  readonly consoleCheck: HTMLElement;
  readonly consoleCheckList: HTMLElement;
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
  readonly clipInput: HTMLInputElement;
  readonly confirmDialog: HTMLDialogElement;
  readonly confirmForm: HTMLFormElement;
  readonly confirmCanvas: HTMLCanvasElement;
  readonly confirmInfo: HTMLElement;
  readonly confirmCheck: HTMLElement;
  readonly confirmCancel: HTMLButtonElement;
}

export const queryElements = (root: ParentNode): Elements => ({
  form: byId(root, 'controls', HTMLFormElement),
  languageForm: byId(root, 'language-form', HTMLFormElement),
  language: byId(root, 'language', HTMLSelectElement),
  tv: byId(root, 'tv', HTMLElement),
  screen: byId(root, 'screen', HTMLElement),
  canvasWrap: byId(root, 'canvas-wrap', HTMLElement),
  crtCanvas: byId(root, 'crt-canvas', HTMLCanvasElement),
  sourceCanvas: byId(root, 'source-canvas', HTMLCanvasElement),
  emptyState: byId(root, 'empty-state', HTMLElement),
  busy: byId(root, 'busy', HTMLElement),
  chooseButton: byId(root, 'choose-button', HTMLButtonElement),
  clipButton: byId(root, 'clip-button', HTMLButtonElement),
  busyProgress: byId(root, 'busy-progress', HTMLElement),
  exportVideoButton: byId(root, 'export-video-button', HTMLButtonElement),
  compareToggle: byId(root, 'compare-toggle', HTMLInputElement),
  splitField: byId(root, 'split-field', HTMLElement),
  compareSplit: byId(root, 'compare-split', HTMLInputElement),
  exportButton: byId(root, 'export-button', HTMLButtonElement),
  copyLinkButton: byId(root, 'copy-link-button', HTMLButtonElement),
  zoomInButton: byId(root, 'zoom-in-button', HTMLButtonElement),
  zoomOutButton: byId(root, 'zoom-out-button', HTMLButtonElement),
  zoomReadout: byId(root, 'zoom-readout', HTMLOutputElement),
  resetViewButton: byId(root, 'reset-view-button', HTMLButtonElement),
  fullscreenButton: byId(root, 'fullscreen-button', HTMLButtonElement),
  notice: byId(root, 'notice', HTMLElement),
  sourceInfo: byId(root, 'source-info', HTMLElement),
  consoleCheck: byId(root, 'console-check', HTMLElement),
  consoleCheckList: byId(root, 'console-check-list', HTMLElement),
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
  flickerInput: byId(root, 'flicker-input', HTMLInputElement),
  clipInput: byId(root, 'clip-input', HTMLInputElement),
  confirmDialog: byId(root, 'confirm-dialog', HTMLDialogElement),
  confirmForm: byId(root, 'confirm-form', HTMLFormElement),
  confirmCanvas: byId(root, 'confirm-canvas', HTMLCanvasElement),
  confirmInfo: byId(root, 'confirm-info', HTMLElement),
  confirmCheck: byId(root, 'confirm-check', HTMLElement),
  confirmCancel: byId(root, 'confirm-cancel', HTMLButtonElement)
});
