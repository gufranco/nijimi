export const exportCanvas = async (input: {
  readonly canvas: HTMLCanvasElement;
  readonly name: string;
  readonly download: (blob: Blob, name: string) => void;
}): Promise<void> => {
  const blob = await new Promise<Blob | null>((resolve) => {
    input.canvas.toBlob(resolve, 'image/png');
  });
  if (blob === null) {
    throw new Error('the preview canvas produced no PNG');
  }
  input.download(blob, input.name);
};
