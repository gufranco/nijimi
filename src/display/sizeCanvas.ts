export const sizeCanvas = (canvas: HTMLCanvasElement, width: number, height: number): void => {
  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }
};
