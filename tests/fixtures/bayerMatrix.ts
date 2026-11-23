type Matrix = readonly (readonly number[])[];

const MAX_ORDER = 16;

const grow = (matrix: Matrix): Matrix => {
  const size = matrix.length;
  return Array.from({ length: size * 2 }, (_, y) =>
    Array.from({ length: size * 2 }, (_, x) => {
      const base = 4 * (matrix[y % size]?.[x % size] ?? 0);
      const quadrant = [
        [0, 2],
        [3, 1]
      ][Math.floor(y / size)]?.[Math.floor(x / size)];
      return base + (quadrant ?? 0);
    })
  );
};

export const bayerMatrix = (order: number): Matrix => {
  const steps = Math.round(Math.log2(Math.min(order, MAX_ORDER)));
  return Array.from({ length: steps }).reduce<Matrix>((matrix) => grow(matrix), [[0]]);
};
