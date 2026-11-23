export const fieldCount = (duration: number, fieldRate: number): number =>
  Math.max(1, Math.floor(duration * fieldRate));
