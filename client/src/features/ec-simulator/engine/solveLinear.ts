/** Real Gaussian elimination with partial pivoting. Returns null if singular. */

const EPS = 1e-14;

export function solveReal(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  const aug = A.map((row, i) => {
    const copy = row.slice();
    copy.push(b[i] ?? 0);
    return copy;
  });

  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(aug[col][col]);
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(aug[row][col]);
      if (v > maxVal) {
        maxVal = v;
        maxRow = row;
      }
    }
    if (maxVal < EPS) return null;
    if (maxRow !== col) {
      const tmp = aug[col];
      aug[col] = aug[maxRow];
      aug[maxRow] = tmp;
    }
    const pivot = aug[col][col];
    for (let row = col + 1; row < n; row++) {
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= n; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = aug[i][n];
    for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
    const diag = aug[i][i];
    if (Math.abs(diag) < EPS) return null;
    x[i] = sum / diag;
  }
  return x;
}
