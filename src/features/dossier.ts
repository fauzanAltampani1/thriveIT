// 02 · Dossier: a retro PC, pinned. Scrolling first fills the loading bar, then shows the index, then opens the five
// files one by one (each with a glitch, a burst of static and the text typing in). Scrolling up plays it backwards.
// The tabs jump the scroll to a file, so scroll stays the one source of truth.
import { FILES, type DossierFile } from '../content/dossier';
import { byId, esc, pad2, qs } from '../core/dom';
import { logoInner } from '../core/glyphs';
import { reducedMotion } from '../core/motion';
import { iconPath } from '../core/pixel';
import type { Scenes } from './scenes';

export interface Dossier {
  update(): void;
}

interface Row { t: string; tag?: string }
type ScreenMode = boolean | 'soft';        // false = instant, true = letter rise + full typing, 'soft' = only the last row types
type DossierState = 'load' | 'index' | number | null;

const UNITS = 8, LOAD_U = 2;               // scroll budget: 2 units loading, 1 unit index, 1 unit per file
const enc = new TextEncoder();
const bytes = (f: DossierFile): number => enc.encode(f.lines.join('\n') + '\n').length;
const TOTAL_B = FILES.reduce((s, f) => s + bytes(f), 0);

// the PC, drawn on a 100×86 grid in five warm greys
const PAL = { k0: '#1b1a17', k1: '#3b3832', k2: '#66625a', k3: '#8f8a7f', k4: '#aca699', k5: '#c7c1b3' };
type Shade = keyof typeof PAL;
const PC: [Shade, number, number, number, number][] = [
  ['k3', 9, 0, 82, 64], ['k3', 8, 1, 84, 62],
  ['k5', 9, 0, 82, 1], ['k4', 8, 1, 1, 62], ['k2', 91, 1, 1, 62], ['k2', 9, 63, 82, 1],
  ['k2', 15, 4, 70, 48], ['k1', 16, 5, 68, 46], ['k0', 16, 5, 68, 1], ['k0', 16, 5, 1, 46], ['k0', 18, 7, 64, 42],
  ['k0', 52, 56, 22, 2], ['k4', 52, 58, 22, 1], ['k2', 76, 56, 3, 2],
  ['k2', 34, 64, 32, 3], ['k1', 30, 67, 40, 2],
  ['k3', 4, 71, 92, 14], ['k5', 5, 71, 90, 1], ['k4', 4, 72, 1, 12], ['k2', 95, 72, 1, 12], ['k2', 4, 84, 92, 1],
  ['k1', 28, 79, 42, 2],
];
for (let i = 0; i < 6; i++) PC.push(['k1', 87, 10 + i * 3, 3, 1]);                       // vent
for (let k = 0; k <= 16; k++) PC.push(['k1', 8 + 5 * k, 73, 4, 2]);                      // keys
for (let k = 0; k <= 15; k++) PC.push(['k1', 10 + 5 * k, 76, 4, 2]);
for (let k = 0; k < 4; k++) PC.push(['k1', 8 + 5 * k, 79, 4, 2], ['k1', 72 + 5 * k, 79, 4, 2]);

// pixel static on the screen's own 64×42 grid
const NZ = [[4, 41, 45], [63, 182, 192], [143, 230, 236], [233, 254, 255]];

export function createDossier(scenes: Scenes): Dossier {
  byId('pcArt').innerHTML =
    PC.map((r) => '<rect x="' + r[1] + '" y="' + r[2] + '" width="' + r[3] + '" height="' + r[4] + '" fill="' + PAL[r[0]] + '"></rect>').join('') +
    '<rect class="pc-led" x="87" y="56" width="2" height="2" style="fill:var(--ac)"></rect>' +
    '<svg x="17" y="54.4" width="22" height="6.1" viewBox="130 130 1784 495" shape-rendering="geometricPrecision" style="color:' + PAL.k2 + '">' + logoInner(false) + '</svg>';

  const pcEl = byId('pc'), scr = byId('scr'), scrIn = byId('scrIn'), scrSys = byId('scrSys'), scrTitle = byId('scrTitle'), scrRule = byId('scrRule');
  const scrLines = byId('scrLines'), dRead = byId('dRead'), scrIco = byId('scrIco'), scrMeta = byId('scrMeta');
  const dNowT = byId('dNowT'), dLive = byId('dLive'), dTrack = byId('dTrack'), dStage = byId('dStage');
  const dSegs = Array.from(byId('dSegs').children), dPos = byId('dPos'), dHint = byId('dHint');
  const dtabs = FILES.map((_, i) => byId<HTMLButtonElement>('dt-' + i));
  dtabs.forEach((b, i) => { qs('.fs', b).textContent = bytes(FILES[i]) + ' B'; });
  const nzCtx = byId<HTMLCanvasElement>('scrNz').getContext('2d');
  const sCaret = document.createElement('i');
  sCaret.className = 's-caret';
  sCaret.setAttribute('aria-hidden', 'true');
  const rCaret = document.createElement('i');
  rCaret.className = 'caret';
  rCaret.setAttribute('aria-hidden', 'true');

  let curF: number | 'L' | null = null, dState: DossierState = null;
  let lastQ = -1, lastHint = '', swTok = 0, typeTok = 0, typeTimer = 0;

  function setTitle(text: string, dot: boolean, animate: boolean): void {
    scrTitle.innerHTML = Array.from(text).map((c, i) => '<span class="t" style="--i:' + i + '">' + (c === ' ' ? '&nbsp;' : esc(c)) + '</span>').join('') +
      (dot ? '<span class="t dot" style="--i:' + text.length + '"></span>' : '');
    if (!animate) { scrTitle.className = 'scr-title'; return; }
    scrTitle.className = 'scr-title pre';
    void scrTitle.offsetWidth;
    scrTitle.className = 'scr-title rise';
  }

  // the same rows go to the screen and to the phone reader; only one of them is displayed.
  // rows before `from` appear at once, the rest type in.
  function writeLines(rows: Row[], animate: boolean, from: number): void {
    const my = ++typeTok;
    clearTimeout(typeTimer);
    const start = animate ? from : rows.length;
    const html = rows.map((r, k) => '<li><span>' + (k < start ? esc(r.t) : '') + '</span>' +
      (r.tag != null ? '<b' + (k < start ? '' : ' hidden') + '>' + r.tag + '</b>' : '') + '</li>').join('');
    scrLines.innerHTML = html;
    dRead.innerHTML = html;
    const spans = [scrLines, dRead].map((el) => Array.from(el.querySelectorAll<HTMLElement>('li > span')));
    const tags = [scrLines, dRead].map((el) => Array.from(el.children).map((li) => li.querySelector<HTMLElement>('b')));
    const put = (k: number): void => { spans[0][k].appendChild(sCaret); spans[1][k].appendChild(rCaret); };
    const last = rows.length - 1;
    if (start > last) { put(last); return; }
    let li = start, ci = 0;
    const step = (): void => {
      if (my !== typeTok) return;
      const t = rows[li].t;
      ci = Math.min(t.length, ci + 2);
      spans[0][li].textContent = t.slice(0, ci);
      spans[1][li].textContent = t.slice(0, ci);
      put(li);
      if (ci < t.length) { typeTimer = window.setTimeout(step, 14); return; }
      tags.forEach((arr) => { const b = arr[li]; if (b) b.hidden = false; });
      if (li >= last) return;
      li++; ci = 0;
      typeTimer = window.setTimeout(step, 60);
    };
    step();
  }

  function paintScreen(i: number, mode: ScreenMode): void {
    curF = i;
    scrRule.style.width = '';
    const f = i < 0 ? null : FILES[i];
    scrSys.textContent = f ? 'DOSSIER ' + pad2(i + 1) + ' // ' + f.name : 'DOSSIER // INDEX';
    setTitle(f ? f.word : 'Lima file dimuat.', !!f, !!mode);
    scrIco.innerHTML = iconPath(f ? f.icon : 'prompt');
    scrMeta.textContent = f ? f.lines.length + ' LINES · ' + bytes(f) + ' B · READ-ONLY' : '5 FILES · ' + TOTAL_B + ' B · READ-ONLY';
    const rows: Row[] = f
      ? f.lines.map((t) => ({ t }))
      : FILES.map((x): Row => ({ t: x.name, tag: 'OK' })).concat([{ t: '> Scroll atau pilih file' }]);
    writeLines(rows, !!mode, mode === 'soft' ? rows.length - 1 : 0);
  }

  // loading is scrubbed by scroll: q runs 0 → 1, each file takes a fifth of it
  function paintLoading(q: number): void {
    const qs40 = Math.round(q * 40) / 40;
    const entering = curF !== 'L';
    if (!entering && qs40 === lastQ) return;
    lastQ = qs40;
    if (entering) {
      ++typeTok;
      clearTimeout(typeTimer);
      curF = 'L';
      scrSys.textContent = 'DOSSIER // LOADING';
      scrIco.innerHTML = iconPath('prompt');
      scrTitle.className = 'scr-title';
      const html = FILES.map((f) => '<li class="dim"><span>' + esc(f.name) + '</span><b></b></li>').join('');
      scrLines.innerHTML = html;
      dRead.innerHTML = html;
    }
    const pct = Math.round(qs40 * 100);
    scrTitle.textContent = 'Memuat ' + pct + '%';
    scrRule.style.width = (Math.round(qs40 * 20) * 5) + '%';
    let done = 0, loaded = 0, at = 0;
    FILES.forEach((f, k) => {
      const fk = Math.max(0, Math.min(1, qs40 * 5 - k));
      if (fk >= 1) { done++; loaded += bytes(f); }
      else loaded += Math.round(bytes(f) * fk);
      if (fk > 0) at = k;
      const tag = fk >= 1 ? 'OK' : (fk > 0 ? Math.round(fk * 100) + '%' : '');
      [scrLines, dRead].forEach((el) => {
        const li = el.children[k];
        li.classList.toggle('dim', fk === 0);
        if (li.lastChild) li.lastChild.textContent = tag;
      });
    });
    scrLines.children[at].firstChild?.appendChild(sCaret);
    dRead.children[at].firstChild?.appendChild(rCaret);
    scrMeta.textContent = 'LOADING ' + done + '/5 · ' + loaded + ' B';
    dNowT.textContent = 'LOADING ' + pct + '%';
  }

  function staticBurst(my: number, dur: number, done: () => void): void {
    const end = performance.now() + dur;
    const f = (): void => {
      if (my !== swTok) return;
      if (nzCtx) {
        const img = nzCtx.createImageData(64, 42);
        for (let y = 0; y < 42; y++) {
          const band = Math.random() < 0.25, base = Math.floor(Math.random() * 4);
          for (let x = 0; x < 64; x++) {
            const c = NZ[band ? base : (Math.random() < 0.55 ? 0 : Math.floor(Math.random() * 4))];
            const o = (y * 64 + x) * 4;
            img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 255;
          }
        }
        nzCtx.putImageData(img, 0, 0);
      }
      if (performance.now() < end) window.setTimeout(f, 40); else done();
    };
    f();
  }

  function settle(): void {
    scrIn.classList.remove('jit');
    scr.classList.remove('nz');
    pcEl.classList.remove('busy');
  }
  function markTabs(i: number): void { dtabs.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i))); }

  // glitch out → static → new screen
  function showFile(i: number, animate: boolean): void {
    const my = ++swTok;
    markTabs(i);
    dNowT.textContent = i < 0 ? '00 / INDEX' : pad2(i + 1) + ' / ' + FILES[i].word;
    dLive.textContent = i < 0 ? 'Lima file dimuat' : 'Dibuka ' + FILES[i].name;
    if (!animate || reducedMotion.matches) { settle(); paintScreen(i, false); return; }
    pcEl.classList.add('busy');
    scrIn.classList.remove('jit');
    void scrIn.offsetWidth;
    scrIn.classList.add('jit');
    window.setTimeout(() => {
      if (my !== swTok) return;
      scr.classList.add('nz');
      staticBurst(my, 150, () => {
        scr.classList.remove('nz');
        scrIn.classList.remove('jit');
        paintScreen(i, true);
        window.setTimeout(() => { if (my === swTok) pcEl.classList.remove('busy'); }, 700);
      });
    }, 200);
  }

  function metrics(): { total: number; cur: number } {
    const tr = dTrack.getBoundingClientRect(), tx = scenes.tx();   // --tx at each end holds still for the swaps
    return { total: tr.height - dStage.offsetHeight - 2 * tx, cur: -tr.top - tx };
  }

  function update(): void {
    const m = metrics();
    if (m.total <= 0) return;
    const p = Math.max(0, Math.min(1, m.cur / m.total));
    const u = p * UNITS;
    let st: 'load' | 'index' | number, q = 0;
    if (u < LOAD_U) { st = 'load'; q = u / LOAD_U; }
    else if (u < LOAD_U + 1) st = 'index';
    else st = Math.min(4, Math.floor(u - LOAD_U - 1));

    if (st === 'load') {
      if (dState !== 'load') { ++swTok; settle(); markTabs(-1); dState = 'load'; }
      paintLoading(q);
    } else if (st !== dState) {
      const prev = dState;
      dState = st;
      if (st === 'index') {
        if (prev === 'load' || prev === null) {
          ++swTok; settle(); markTabs(-1);
          dNowT.textContent = '00 / INDEX';
          dLive.textContent = 'Lima file dimuat';
          paintScreen(-1, prev === null || reducedMotion.matches ? false : 'soft');
        } else showFile(-1, true);
      } else showFile(st, prev !== null);
    }

    const fi = typeof st === 'number' ? st : -1;
    dSegs.forEach((s, k) => { s.className = 'seg' + (k === fi ? ' on' : (k < fi ? ' past' : '')); });
    dPos.textContent = st === 'load' ? 'LOADING ' + Math.round(q * 100) + '%' : (st === 'index' ? '5 FILES LOADED' : pad2(st + 1) + ' / 05');
    const hint = st === 4 ? '↑ KEMBALI · ↓ LANJUT' : 'SCROLL <span class="arw">↓</span>';
    if (hint !== lastHint) { dHint.innerHTML = hint; lastHint = hint; }
  }

  // a click moves the scroll to the middle of that file's stretch
  dtabs.forEach((b, i) => b.addEventListener('click', () => {
    const m = metrics();
    const target = (LOAD_U + 1 + i + 0.5) / UNITS * m.total;
    window.scrollBy({ top: target - m.cur, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }));

  update();
  return { update };
}
