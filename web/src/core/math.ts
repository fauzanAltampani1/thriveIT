export const clamp = (v: number, lo = 0, hi = 1): number => Math.max(lo, Math.min(hi, v));

/** Hermite smoothstep: 0 below a, 1 above b, eased in between. */
export function smoothstep(a: number, b: number, v: number): number {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
}
