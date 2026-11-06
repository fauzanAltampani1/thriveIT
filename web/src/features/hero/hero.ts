// 01 · Hero: five pixel tiles. Hover (or scroll through the pinned hero) swaps the giant word to that service, with
// letters rising in; with nothing picked, the _thrivit logo glitches in and out on a loop the visitor can switch off.
import { DEFAULT_CAPTION, SERVICES } from '../../content/services';
import { byId, esc, qs } from '../../core/dom';
import { letters } from '../../core/glyphs';
import { reducedMotion } from '../../core/motion';
import { toPath } from '../../core/pixel';
import type { Cursor } from '../cursor';
import type { Scenes } from '../scenes';
import { createGlitch } from './glitch';

export interface Hero {
  /** scroll position changed */
  update(): void;
  /** fit the giant word to the width (fonts loaded, resize) */
  fit(): void;
}

type LayerKey = 'A' | 'B';
const OUT_DUR = 240, OUT_STAGGER = 8, GAP = 50;
const LOOP_KEY = 'thrivit-loop';

export function createHero(scenes: Scenes, cursor: Cursor): Hero {
  const track = byId('top'), stage = byId('stage'), wrap = byId('wrap'), tilesEl = byId('tiles');
  const logo = byId('logo'), layers: Record<LayerKey, HTMLElement> = { A: byId('layerA'), B: byId('layerB') };
  const cap = byId('cap'), capK = byId('capK'), capT = byId('capT'), capP = byId('capP');
  const segEls = Array.from(byId('segs').children), segLabel = byId('segLabel');
  const loopBtn = byId<HTMLButtonElement>('loopBtn'), loopV = byId('loopV');

  tilesEl.innerHTML = SERVICES.map((s, i) =>
    '<button type="button" class="tile" id="tile-' + i + '" aria-label="' + esc(s.name) + '">' +
    '<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><path d="' + toPath(s.bmp) + '" fill="currentColor"></path></svg></button>'
  ).join('');
  const tileEls = Array.from(tilesEl.children) as HTMLButtonElement[];

  /* ---------- the logo loop, and its switch (remembered per browser) ---------- */
  const glitch = createGlitch(byId('gl'));
  let loopOn = true;
  try { loopOn = localStorage.getItem(LOOP_KEY) !== '0'; } catch { /* storage blocked: default on */ }
  function syncLoop(): void {
    loopBtn.setAttribute('aria-pressed', String(loopOn));
    loopV.textContent = loopOn ? 'ON' : 'OFF';
    glitch.setLoop(loopOn);
  }
  loopBtn.addEventListener('click', () => {
    loopOn = !loopOn;
    try { localStorage.setItem(LOOP_KEY, loopOn ? '1' : '0'); } catch { /* not remembered, still switched */ }
    syncLoop();
  });
  syncLoop();

  /* ---------- hover / scroll switching ---------- */
  let hover = -1, scrollIdx = -1, active = -1, front: LayerKey = 'A', leaveUntil = 0;

  function fit(): void {
    const avail = wrap.clientWidth * 0.94;
    if (!avail) return;
    [logo, layers.A, layers.B].forEach((L) => {
      const wd = qs('.wd', L), w = wd.offsetWidth;
      wd.style.transform = 'scale(' + (w ? Math.min(1, avail / w) : 1).toFixed(4) + ')';
    });
  }
  function setCaption(k: string, t: string, p: string, base: number): void {
    capK.textContent = k; capT.textContent = t; capP.textContent = p;
    cap.style.setProperty('--cb', base + 'ms');
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
  }
  // letters still low in their clip drop instantly; the rest slide out, and the next word waits for them
  function exit(L: HTMLElement): void {
    if (!L.classList.contains('L-in')) return;
    const now = performance.now();
    let end = now;
    L.querySelectorAll<HTMLElement>('.ch').forEach((ch, i) => {
      const t = getComputedStyle(ch).transform;
      const ty = t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
      if (ty / (ch.offsetHeight || 1) > 0.5) ch.classList.add('drop');
      else end = Math.max(end, now + i * OUT_STAGGER + OUT_DUR);
    });
    L.className = 'L L-out';
    leaveUntil = Math.max(leaveUntil, end);
  }
  function enter(L: HTMLElement, html: string): number {
    L.className = 'L L-pre';
    qs('.wd', L).innerHTML = html;
    void L.offsetWidth;
    const now = performance.now();
    const base = leaveUntil > now ? Math.round(leaveUntil - now + GAP) : 0;
    L.style.setProperty('--base', base + 'ms');
    L.className = 'L L-in';
    return base;
  }
  function render(): void {
    const target = hover >= 0 ? hover : scrollIdx;
    if (target !== active) {
      if (active < 0) leaveUntil = Math.max(leaveUntil, performance.now() + glitch.hide());
      else exit(layers[front]);
      let base: number;
      if (target >= 0) {
        front = front === 'A' ? 'B' : 'A';
        base = enter(layers[front], letters(SERVICES[target].word));
      } else {
        const now = performance.now();
        base = leaveUntil > now ? Math.round(leaveUntil - now + GAP) : 0;
        glitch.show(base);
      }
      active = target;
      tileEls.forEach((b, i) => b.classList.toggle('on', i === active));
      if (active >= 0) {
        const s = SERVICES[active];
        setCaption('0' + (active + 1) + ' // ' + s.word, s.name, s.text, base);
        cursor.setLabel('[0' + (active + 1) + '] ' + s.word);
      } else {
        setCaption(DEFAULT_CAPTION[0], DEFAULT_CAPTION[1], DEFAULT_CAPTION[2], base);
        cursor.setLabel('');
      }
      syncCursor();
      fit();
    }
    const pos = scrollIdx + 1;
    segEls.forEach((el, i) => { el.className = 'seg' + (i === pos ? ' on' : (i < pos ? ' past' : '')); });
    segLabel.textContent = '0' + pos + ' / 05';
  }
  // the service label rides on the cursor only while the hero is on screen
  function syncCursor(): void {
    cursor.setHot(active >= 0 && window.scrollY < scenes.top(1) + scenes.tx() * 0.5);
  }
  // scroll through the pinned hero: logo, then services 1–5
  function progress(): { total: number; cur: number } | null {
    const tr = track.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    const total = tr.height - sr.height - scenes.tx();     // the last --tx holds still for the swap
    return total > 0 ? { total, cur: sr.top - tr.top } : null;
  }
  function readScroll(): void {
    const pr = progress();
    if (!pr) return;
    const p = Math.max(0, Math.min(1, pr.cur / pr.total));
    const idx = Math.min(5, Math.floor(p * 6)) - 1;
    if (idx !== scrollIdx) { scrollIdx = idx; render(); }
  }
  function jump(i: number): void {
    const pr = progress();
    if (!pr) return;
    window.scrollBy({ top: (i + 1.5) / 6 * pr.total - pr.cur, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
  tileEls.forEach((b, i) => {
    b.addEventListener('mouseenter', () => { hover = i; render(); });
    b.addEventListener('focus', () => { hover = i; render(); });
    b.addEventListener('click', () => { hover = i; render(); jump(i); });
  });
  tilesEl.addEventListener('mouseleave', () => { hover = -1; render(); });
  tilesEl.addEventListener('focusout', (e) => { if (!tilesEl.contains(e.relatedTarget as Node | null)) { hover = -1; render(); } });

  glitch.show(150);
  fit();
  readScroll();

  return {
    update: () => { readScroll(); syncCursor(); },
    fit,
  };
}
