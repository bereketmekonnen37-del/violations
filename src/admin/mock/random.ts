/**
 * Seeded PRNG.
 *
 * A tiny mulberry32 implementation gives the mock service deterministic
 * data across dev reloads. Nothing here is used outside of the mock layer.
 */

export interface Random {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(list: readonly T[]) => T;
  sample: <T>(list: readonly T[], size: number) => T[];
  bool: (probability?: number) => boolean;
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function int(min: number, max: number): number {
    return Math.floor(next() * (max - min + 1)) + min;
  }
  function pick<T>(list: readonly T[]): T {
    return list[int(0, list.length - 1)];
  }
  function sample<T>(list: readonly T[], size: number): T[] {
    const copy = list.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, Math.min(size, copy.length));
  }
  function bool(probability = 0.5): boolean {
    return next() < probability;
  }
  return { next, int, pick, sample, bool };
}
