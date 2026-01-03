// src/lib/practice/generator/rng.ts
export type Seed = string | number | undefined;

function hashString(s: string) {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function toSeed(seed: Seed) {
  if (seed === undefined) return (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0;
  if (typeof seed === "number") return (seed >>> 0) || 1;
  return hashString(seed) || 1;
}

// Mulberry32
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  private nextFloat: () => number;

  constructor(seed?: Seed) {
    const s = toSeed(seed);
    this.nextFloat = mulberry32(s);
  }

  float() {
    return this.nextFloat();
  }

  int(min: number, max: number) {
    return Math.floor(this.float() * (max - min + 1)) + min;
  }

  step(min: number, max: number, step: number) {
    const nmin = Math.ceil(min / step);
    const nmax = Math.floor(max / step);
    const n = this.int(nmin, nmax);
    return n * step;
  }

  pick<T>(arr: readonly T[]) {
    return arr[this.int(0, arr.length - 1)];
  }

  shuffle<T>(arr: readonly T[]) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  weighted<T>(items: readonly { value: T; w: number }[]) {
    const total = items.reduce((s, x) => s + x.w, 0);
    let r = this.float() * total;
    for (const it of items) {
      r -= it.w;
      if (r <= 0) return it.value;
    }
    return items[items.length - 1].value;
  }
}
