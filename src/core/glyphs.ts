// The _thrivit lettering: the logo, and display glyphs drawn on the same grid (logo units).
// Stems 66, bars 62, x-height 304–569, ascenders from 216, descenders to 672, i-dots r 71.

type Rect = readonly [x: number, y: number, w: number, h: number];
type Dot = readonly [cx: number, cy: number, r: number];

interface Glyph {
  w: number;
  r: readonly Rect[];
  d?: readonly Dot[];
}

export const GLYPHS: Readonly<Record<string, Glyph>> = {
  '_': { w: 240, r: [[0, 573, 240, 46]] },
  ' ': { w: 120, r: [] },
  a: { w: 260, r: [[0, 304, 212, 62], [194, 364, 66, 205], [48, 405, 212, 62], [0, 465, 66, 44], [48, 507, 212, 62]] },
  c: { w: 260, r: [[48, 304, 212, 62], [48, 507, 212, 62], [0, 364, 66, 145]] },
  k: { w: 246, r: [[0, 216, 66, 353], [48, 405, 150, 62], [180, 304, 66, 103], [180, 465, 66, 104]] },
  r: { w: 208, r: [[54, 304, 154, 62], [0, 364, 66, 205]] },
  b: { w: 260, r: [[0, 216, 66, 353], [0, 304, 212, 62], [0, 507, 212, 62], [194, 364, 66, 145]] },
  d: { w: 260, r: [[194, 216, 66, 353], [48, 304, 212, 62], [48, 507, 212, 62], [0, 364, 66, 145]] },
  e: { w: 260, r: [[48, 304, 164, 62], [0, 364, 66, 145], [194, 364, 66, 103], [0, 405, 260, 62], [48, 507, 212, 62]] },
  g: { w: 260, r: [[48, 304, 212, 62], [194, 304, 66, 308], [0, 364, 66, 145], [48, 507, 212, 62], [0, 610, 212, 62]] },
  i: { w: 114, r: [[24, 304, 66, 265]], d: [[57, 207.5, 71]] },
  l: { w: 172, r: [[0, 216, 66, 293], [54, 507, 118, 62]] },
  m: { w: 454, r: [[0, 304, 66, 265], [0, 304, 406, 62], [194, 364, 66, 205], [388, 364, 66, 205]] },
  n: { w: 260, r: [[0, 304, 66, 265], [0, 304, 212, 62], [194, 364, 66, 205]] },
  o: { w: 260, r: [[48, 304, 164, 62], [48, 507, 164, 62], [0, 364, 66, 145], [194, 364, 66, 145]] },
  p: { w: 260, r: [[0, 304, 66, 368], [0, 304, 212, 62], [0, 507, 212, 62], [194, 364, 66, 145]] },
  s: { w: 260, r: [[48, 304, 212, 62], [0, 364, 66, 43], [48, 405, 164, 62], [194, 465, 66, 44], [0, 507, 212, 62]] },
  t: { w: 236, r: [[0, 304, 228, 62], [64, 216, 66, 293], [118, 507, 118, 62]] },
  u: { w: 260, r: [[0, 304, 66, 205], [48, 507, 212, 62], [194, 304, 66, 265]] },
  w: { w: 454, r: [[0, 304, 66, 205], [194, 304, 66, 205], [388, 304, 66, 205], [48, 507, 358, 62]] }
};

/** logo units → em, so a glyph is as tall as the type around it */
const UNIT = 1.15 / 495;
/** side bearing between glyphs, in logo units */
const SIDE = 34;

const rect = (r: Rect, attrs = ' fill="currentColor"'): string =>
  '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '"' + attrs + '></rect>';

export function glyphSVG(c: string): string {
  const g = GLYPHS[c] ?? GLYPHS[' '];
  const w = g.w + SIDE;
  let s = '<svg viewBox="' + -SIDE / 2 + ' 130 ' + w + ' 550" style="width:' + (w * UNIT).toFixed(4) + 'em;height:' + (550 * UNIT).toFixed(4) +
    'em" aria-hidden="true" focusable="false">';
  g.r.forEach((r) => { s += rect(r); });
  (g.d ?? []).forEach((d) => { s += '<circle class="dotc" cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"></circle>'; });
  return s + '</svg>';
}

/** A word as rising letters (hero layers): each glyph in its own clip so it can slide in. */
export const letters = (word: string): string =>
  Array.from(word).map((c, i) =>
    '<span class="cm"><span class="ch' + (c === '_' ? ' acc' : '') + '" style="--i:' + i + '">' + glyphSVG(c) + '</span></span>'
  ).join('');

export const LOGO_RECTS: readonly Rect[] = [
[136, 573, 240, 46],
[372, 304, 228, 62], [436, 216, 66, 293], [490, 507, 118, 62],
[640, 216, 66, 353], [640, 304, 212, 62], [834, 364, 66, 205],
[990, 304, 154, 62], [936, 364, 66, 205],
[1185, 304, 66, 265],
[1288, 304, 66, 204], [1346, 506, 74, 63], [1472, 304, 66, 150], [1416, 452, 62, 58],
[1573, 304, 66, 265],
[1672, 304, 228, 62], [1736, 216, 66, 293], [1790, 507, 118, 62]
];
export const LOGO_DOTS: readonly Dot[] = [[1218, 207.5, 71], [1606, 207.5, 71]];

/** The logo's shapes. `mono` paints the i-dots in the text colour instead of the accent. */
export const logoInner = (mono: boolean): string =>
  LOGO_RECTS.map((r) => rect(r)).join('') +
  LOGO_DOTS.map((d) => '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '"' + (mono ? ' fill="currentColor"' : ' class="dotc"') + '></circle>').join('');

export const logoSVG = (cls: string, mono: boolean): string =>
  '<svg class="' + cls + '" viewBox="130 130 1784 550" aria-hidden="true" focusable="false">' + logoInner(mono) + '</svg>';

/** "_t", pressed into the wax seal */
const T_RECTS: readonly Rect[] = [[136, 573, 240, 46], [372, 304, 228, 62], [436, 216, 66, 293], [490, 507, 118, 62]];
export const sealMark = (): string => T_RECTS.map((r) => rect(r)).join('');
