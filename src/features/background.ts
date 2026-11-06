// The fixed page background: a colour field that paints each section black or white, with a torn, dithered edge during
// a swap, and the "ThrivIT" glyph smoke drifting along the bottom of the screen. Settings: WAVE and FIELD in config.ts.
import { FIELD, WAVE } from '../config';
import { byId } from '../core/dom';
import { smoothstep } from '../core/math';
import { reducedMotion } from '../core/motion';
import { BAYER4, fbm2, fbm3, valueNoise } from '../core/noise';
import type { Scenes } from './scenes';

const BLACK = 0xff000000, WHITE = 0xffffffff;
const CHARS = ['T', 'h', 'r', 'i', 'v', 'I'];
const WORD = [0, 1, 2, 3, 4, 5, 0];            // "ThrivIT" as indexes into CHARS
const LEVELS = 12;                              // brightness steps in the glyph atlas

export function createBackground(scenes: Scenes): void {
  const fieldCv = byId<HTMLCanvasElement>('bgField'), smokeCv = byId<HTMLCanvasElement>('bgSmoke');
  const fctx = fieldCv.getContext('2d'), sctx = smokeCv.getContext('2d');
  if (!fctx || !sctx) return;                   // no canvas: scenes keep clipping with straight edges
  const field = fctx, smoke = sctx;
  scenes.takeOver();

  /* ===== colour field ===== */
  const isLight = scenes.els.map((el) => FIELD.light.includes(el.id));
  let W = 0, H = 0, G = 4, fw = 0, fh = 0, solid = 0;
  let fimg = field.createImageData(1, 1), fbuf = new Uint32Array(fimg.data.buffer), edge = new Float32Array(0);
  let lastY = window.scrollY, vel = 0, amp = 0, ampV = 0, dir = 1;

  // displacement of swap b's edge at x: broad hills + ridges + small teeth; scroll speed stirs it and drags it against the motion
  function rough(b: number, x: number, t: number, m: number): number {
    if (!m) return 0;
    const s = b * 31.7;
    const big = (fbm3(x * 0.0026 + s, t * 0.06 + b) - 0.5) * 2;
    const mid = (fbm3(x * 0.011 + s + 5, t * 0.15 + b) - 0.5) * 2;
    const fine = (valueNoise(x * 0.07 + s, t * 0.9 + b) - 0.5) * 2;
    return m * ((FIELD.rough + Math.abs(amp)) * (big * 0.65 + mid * 0.35) + fine * FIELD.jag + dir * amp * 0.5);
  }
  // 0 when the edge sits at the screen's top or bottom, 1 across the middle: a section at rest is always clean
  const calm = (y: number): number => smoothstep(-40, 220, y) * smoothstep(H + 40, H - 220, y);

  function drawField(t: number): void {
    const s = scenes.at(window.scrollY);
    if (!s.k) {                                   // at rest: one flat colour
      const col = isLight[s.cur] ? WHITE : BLACK;
      if (solid !== col) { fbuf.fill(col); field.putImageData(fimg, 0, 0); solid = col; }
      scenes.apply(null, 0);
      return;
    }
    solid = 0;
    const up = isLight[s.k - 1] ? WHITE : BLACK, lo = isLight[s.k] ? WHITE : BLACK;
    const ey = H * (1 - s.p), m = reducedMotion.matches ? 0 : calm(ey);
    for (let c = 0; c < fw; c++) edge[c] = ey + rough(s.k, c * G + G / 2, t, m);
    const fr = FIELD.fringe * m, isl = FIELD.islands * m, reach = fr + isl * 0.5;
    for (let r = 0; r < fh; r++) {
      const y = r * G + G / 2, row = r * fw;
      for (let c = 0; c < fw; c++) {
        const dy = y - edge[c];
        let below = dy > 0;
        if (m > 0.01 && dy < reach && dy > -reach) {    // the fringe: halftone toward the other colour, plus loose bits
          const n = (fbm2((c * G + G / 2) * 0.013, y * 0.013 + t * 0.22) - 0.5) * isl;
          below = smoothstep(-fr, fr, dy + n) > BAYER4[(r & 3) * 4 + (c & 3)];
        }
        fbuf[row + c] = below ? lo : up;
      }
    }
    field.putImageData(fimg, 0, 0);
    scenes.apply(edge, G);
  }
  // the smoke asks the field which colour is behind a point
  function lightAt(x: number, y: number): number {
    const c = Math.min(fw - 1, Math.max(0, (x / G) | 0)), r = Math.min(fh - 1, Math.max(0, (y / G) | 0));
    return fbuf[r * fw + c] === WHITE ? 1 : 0;
  }

  /* ===== glyph smoke ===== */
  let sdpr = 1, cw = 5, ch = 8, scols = 0, srows = 0, aw = 0, ah = 0;
  let atlas = document.createElement('canvas');
  let colH = new Float32Array(0), colX = new Float32Array(0), colLife = new Float32Array(0), colTint = new Float32Array(0);
  let mx = -9999, my = -9999, sx = -9999, sy = -9999, mouseIn = false, ms = 0;

  // four inks: gray and teal on black, and the same two inverted for white sections
  function ink(scheme: number, tint: number, v: number): number[] {
    if (!scheme) return tint ? [v * 0.45, v * 0.9, v * 0.95] : [v, v, v];
    const k = v * 0.85;
    return tint ? [255 - k, 255 - k * 0.45, 255 - k * 0.4] : [255 - k, 255 - k, 255 - k];
  }
  function makeAtlas(): void {
    aw = Math.max(2, Math.round(cw * sdpr));
    ah = Math.max(2, Math.round(ch * sdpr));
    atlas = document.createElement('canvas');
    atlas.width = aw * CHARS.length;
    atlas.height = ah * LEVELS * 4;
    const g = atlas.getContext('2d');
    if (!g) return;
    g.font = '700 ' + (WAVE.fontPx * (W < 640 ? 0.9 : 1) * sdpr).toFixed(1) + 'px "Space Mono", ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (let grp = 0; grp < 4; grp++) {
      for (let l = 0; l < LEVELS; l++) {
        const c = ink(grp >> 1, grp & 1, 22 + l * 12).map(Math.round);
        g.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        for (let k = 0; k < CHARS.length; k++) g.fillText(CHARS[k], k * aw + aw / 2, (grp * LEVELS + l) * ah + ah / 2);
      }
    }
  }

  function sizeAll(): void {
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    G = W < 640 ? 3 : 4;                           // field cell size, CSS px
    fw = Math.ceil(W / G); fh = Math.ceil(H / G);
    fieldCv.width = fw; fieldCv.height = fh;
    fimg = field.createImageData(fw, fh);
    fbuf = new Uint32Array(fimg.data.buffer);
    edge = new Float32Array(fw); solid = 0;
    sdpr = Math.min(2, dpr);
    smokeCv.width = Math.round(W * sdpr); smokeCv.height = Math.round(H * sdpr);
    const k = W < 640 ? 0.9 : 1;
    cw = WAVE.cellW * k; ch = WAVE.cellH * k;
    scols = Math.ceil(W / cw) + 1;
    srows = Math.ceil(H * WAVE.band * 2.2 / ch) + 1;
    colH = new Float32Array(scols); colX = new Float32Array(scols); colLife = new Float32Array(scols); colTint = new Float32Array(scols);
    makeAtlas();
  }

  function drawSmoke(t: number): void {
    smoke.clearRect(0, 0, smokeCv.width, smokeCv.height);
    const band = H * WAVE.band, drift = t * WAVE.speed, slowT = t * WAVE.fade;
    const R = WAVE.mouseRadius, R2 = R * R, tintAt = WAVE.tint > 0 ? 0.75 - WAVE.tint * 0.4 : 2;
    ms += ((mouseIn ? 1 : 0) - ms) * 0.05;
    sx += (mx - sx) * 0.12; sy += (my - sy) * 0.12;

    // per column: the skyline. Broad hills × sharp peaks, scaled by a slow "life" field that lets regions sink away and regrow.
    for (let c = 0; c < scols; c++) {
      const X = c * cw + drift;
      const base = fbm3(X * 0.0032, 1.7 + slowT * 0.4);
      const ridge = 1 - Math.abs(2 * fbm2(X * 0.011, 5.3 + slowT) - 1);
      const life = smoothstep(0.22, 0.5, fbm2(X * 0.0016 + 40, slowT * 1.3 + 9));
      const bn = Math.max(0, Math.min(1, (base - 0.3) / 0.4));
      colX[c] = X;
      colLife[c] = life;
      colH[c] = band * (0.45 + 1.3 * Math.pow(bn, 1.3) * (0.4 + 0.6 * ridge)) * (0.3 + 0.7 * life);
      colTint[c] = fbm2(X * 0.0024 + 120, slowT * 0.8 + 2);
    }

    for (let c = 0; c < scols; c++) {
      const x = c * cw;
      for (let r = 0; r < srows; r++) {
        const yb = r * ch + ch / 2;                // distance from the bottom of the screen
        const y = H - yb;
        let X = colX[c], hh = colH[c], k = 0;
        if (ms > 0.01) {                           // the cursor bends the flow away from itself and lifts it a little
          const dx = x - sx, dy = y - sy, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1;
            k = 1 - d / R; k = k * k * ms;
            X -= dx / d * WAVE.mousePush * k;
            hh += WAVE.mousePush * 1.4 * k;
          }
        }
        if (yb > hh + ch * 2) { if (yb > colH[c] + ch * 2 + WAVE.mousePush * 1.5) break; continue; }
        const n = fbm2(X * 0.018, yb * 0.028 + t * 0.06);          // slow churn along the edge
        const hole = fbm2(X * 0.008, yb * 0.012 + slowT * 2);      // drifting gaps inside the mass
        let dens = (1 - yb / hh) * 4.5 + (n - 0.5) * 0.7;          // solid inside, a thin dithered rim
        dens = Math.max(0, Math.min(1, dens)) * colLife[c] * (1 - smoothstep(0.66, 0.78, hole));
        if (dens <= BAYER4[(r & 3) * 4 + (c & 3)]) continue;
        const gray = WAVE.shade * (0.55 + 0.45 * dens) + WAVE.mouseGlow * k;
        const lvl = Math.max(0, Math.min(LEVELS - 1, Math.round((gray - 22) / 12)));
        const grp = lightAt(x, y) * 2 + ((colTint[c] > tintAt || k > 0.35) ? 1 : 0);
        const ci = WORD[(c + r * 3) % 7];
        smoke.drawImage(atlas, ci * aw, (grp * LEVELS + lvl) * ah, aw, ah, Math.round(x * sdpr), Math.round(y * sdpr - ah / 2), aw, ah);
      }
    }
  }

  /* ===== loop ===== */
  // the field redraws every frame while the page moves or the edge is still settling, so edges stay locked to the sections;
  // the smoke redraws at WAVE.fps (drops to 20 fps if a device can't keep up)
  let raf = 0, lastSmoke = 0, frameGap = 1000 / WAVE.fps, slow = 0;
  const t0 = performance.now() - 30000;
  function step(now: number): void {
    raf = requestAnimationFrame(step);
    const t = (now - t0) / 1000;
    const y = window.scrollY, dy = y - lastY;
    lastY = y;
    vel += (dy - vel) * 0.35;
    if (Math.abs(vel) > 0.5) dir = vel > 0 ? 1 : -1;
    const target = Math.min(FIELD.maxStir, Math.abs(vel) * FIELD.stir);
    ampV += (target - amp) * FIELD.spring;
    ampV *= FIELD.damp;
    amp += ampV;
    const smokeDue = now - lastSmoke >= frameGap - 2;
    if (dy !== 0 || Math.abs(ampV) > 0.05 || Math.abs(amp) > 0.5 || smokeDue) drawField(t);
    if (smokeDue) {
      const s = performance.now();
      drawSmoke(t);
      lastSmoke = now;
      slow = performance.now() - s > 16 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 40 && frameGap < 50) { frameGap = 50; slow = 0; }
    }
  }
  // reduced motion: straight edges and a still smoke, redrawn only when the page scrolls or resizes
  let pending = false;
  function still(): void { pending = false; drawField(0); drawSmoke(12); }
  function onStillScroll(): void { if (!pending) { pending = true; requestAnimationFrame(still); } }
  function start(): void {
    cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('scroll', onStillScroll);
    if (reducedMotion.matches) { still(); window.addEventListener('scroll', onStillScroll, { passive: true }); }
    else raf = requestAnimationFrame(step);
  }

  window.addEventListener('pointermove', (e) => {
    if (!mouseIn && ms < 0.02) { sx = e.clientX; sy = e.clientY; }
    mx = e.clientX; my = e.clientY;
    mouseIn = true;
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => { mouseIn = false; });

  sizeAll();
  let rz = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = window.setTimeout(() => { sizeAll(); if (reducedMotion.matches) still(); }, 120);
  });
  void document.fonts.ready.then(() => { makeAtlas(); if (reducedMotion.matches) still(); });
  reducedMotion.addEventListener('change', start);
  start();
}
