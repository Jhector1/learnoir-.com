export type Mat = number[][];

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function zeros(m: number, n: number): Mat {
  return Array.from({ length: m }, () => Array.from({ length: n }, () => 0));
}

export function eye(n: number): Mat {
  const M = zeros(n, n);
  for (let i = 0; i < n; i++) M[i][i] = 1;
  return M;
}

export function diag(v: number[]): Mat {
  const n = v.length;
  const M = zeros(n, n);
  for (let i = 0; i < n; i++) M[i][i] = v[i];
  return M;
}

export function triu(A: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const U = zeros(m, n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) U[i][j] = j >= i ? A[i][j] : 0;
  return U;
}

export function tril(A: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const L = zeros(m, n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) L[i][j] = j <= i ? A[i][j] : 0;
  return L;
}

export function transpose(A: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const T = zeros(n, m);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}

export function add(A: Mat, B: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const C = zeros(m, n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) C[i][j] = A[i][j] + B[i][j];
  return C;
}

export function scale(A: Mat, s: number): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const C = zeros(m, n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) C[i][j] = A[i][j] * s;
  return C;
}

export function hadamard(A: Mat, B: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const C = zeros(m, n);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) C[i][j] = A[i][j] * B[i][j];
  return C;
}

export function matmul(A: Mat, B: Mat): Mat {
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const n2 = B.length;
  const k = B[0]?.length ?? 0;
  if (n !== n2) throw new Error("matmul: inner dimensions mismatch");

  const C = zeros(m, k);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let t = 0; t < n; t++) s += A[i][t] * B[t][j];
      C[i][j] = s;
    }
  }
  return C;
}

export function dot(a: number[], b: number[]) {
  if (a.length !== b.length) throw new Error("dot: length mismatch");
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

export function randnInt(m: number, n: number, lo = -3, hi = 3): Mat {
  const M = zeros(m, n);
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      M[i][j] = lo + Math.floor(Math.random() * (hi - lo + 1));
    }
  }
  return M;
}

export function maxAbs(A: Mat) {
  let mx = 0;
  for (const row of A) for (const x of row) mx = Math.max(mx, Math.abs(x));
  return mx;
}

export function isSymmetric(A: Mat, eps = 1e-9) {
  const n = A.length;
  if (!n) return true;
  if (A[0].length !== n) return false;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (Math.abs(A[i][j] - A[j][i]) > eps) return false;
    }
  }
  return true;
}
