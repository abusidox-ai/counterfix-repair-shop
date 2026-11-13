// Seeded RNG (mulberry32). Pure: the seed lives in game state so rules stay deterministic.
export function next(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) | 0;
  const s = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s];
}

/** A small stateful generator for building content from a seed. */
export function stream(seed: number) {
  let s = seed | 0;
  const r = () => { const [v, n] = next(s); s = n; return v; };
  return {
    r,
    int: (lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1)),
    pick: <T,>(a: readonly T[]): T => a[Math.floor(r() * a.length)]!,
    chance: (p: number) => r() < p,
    get seed() { return s; },
  };
}
