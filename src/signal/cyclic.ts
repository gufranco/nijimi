export const cyclic = <T>(items: readonly [T, ...T[]], index: number): T =>
  items[index % items.length] ?? items[0];
