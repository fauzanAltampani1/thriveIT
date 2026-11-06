// Value noise and fractal sums of it, all 0…1. Seeded, so every visit draws the same shapes.

const PERM = new Uint8Array(512);
{
  const p = Array.from({ length: 256 }, (_, i) => i);
  let s = 1337;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const hash = (x: number, y: number): number => PERM[(PERM[x & 255] + y) & 255] / 255;

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export const fbm2 = (x: number, y: number): number =>
  valueNoise(x, y) * 0.66 + valueNoise(x * 2.03 + 17.1, y * 2.03 + 3.3) * 0.34;

export const fbm3 = (x: number, y: number): number =>
  valueNoise(x, y) * 0.57 + valueNoise(x * 2.03 + 17.1, y * 2.03 + 3.3) * 0.29 + valueNoise(x * 4.01 + 5.7, y * 4.01 + 11.9) * 0.14;

/** 4×4 ordered-dither thresholds: thin areas drop cells in a regular pattern instead of fading. */
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
