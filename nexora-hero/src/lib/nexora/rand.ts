/**
 * Deterministic pseudo-random in [0, 1), seeded by a plain number.
 * Used instead of Math.random() so procedural geometry stays a pure function of its
 * inputs (required by the React Compiler's purity rules, and it keeps re-renders stable).
 */
export function hashRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453123;
  return x - Math.floor(x);
}

/** Deterministic spread in [-half, half), analogous to THREE.MathUtils.randFloatSpread. */
export function hashSpread(seed: number, range: number): number {
  return (hashRandom(seed) - 0.5) * range;
}

/** Turns an id string into a stable numeric seed for hashRandom. */
export function seedFromString(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}
