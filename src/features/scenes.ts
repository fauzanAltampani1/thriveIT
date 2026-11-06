// One section fills the screen at a time. Between two, both hold still (CSS sticky + an overlap of one screen + --tx,
// see styles/scenes.css) while a torn edge sweeps up from the bottom and swaps them, so scrolling only moves the edge.
// The page background draws the edge and hands its shape to apply(), which clips the two sections along it.
import { byId } from '../core/dom';
import { reducedMotion } from '../core/motion';

export interface SceneState {
  /** index of the section coming in (1…), or 0 when one section fills the screen */
  k: number;
  /** how far that reveal is, 0…1 */
  p: number;
  /** the section on screen (the outgoing one during a reveal) */
  cur: number;
}

export interface Scenes {
  readonly els: readonly HTMLElement[];
  /** px of scroll one swap takes */
  tx(): number;
  /** page px where section i's reveal starts */
  top(i: number): number;
  index(id: string): number;
  at(y: number): SceneState;
  /** clip the sections for the current scroll; edge = screen y of the edge per column, `gap` px apart (null: straight) */
  apply(edge: Float32Array | null, gap: number): void;
  /** the page background calls this once it is drawing edges itself */
  takeOver(): void;
}

const HIDE = 'inset(100% 0 0 0)';

export function createScenes(ids: readonly string[]): Scenes {
  const els = ids.map((id) => byId(id));
  const probe = byId('txProbe');
  const tops = els.map(() => 0);
  const clipNow: (string | null)[] = els.map(() => null);
  let tx = window.innerHeight;
  let backgroundLive = false;

  function measure(): void {
    tx = probe.offsetHeight || window.innerHeight;
    els.forEach((el, i) => {
      let y = 0;
      for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) y += e.offsetTop;
      tops[i] = y;
    });
  }

  function at(y: number): SceneState {
    let cur = 0;
    for (let i = 1; i < els.length; i++) {
      const p = (y - tops[i]) / tx;
      if (p >= 1) cur = i;
      else if (p > 0) return { k: i, p, cur: i - 1 };
    }
    return { k: 0, p: 0, cur };
  }

  function setClip(i: number, v: string): void {
    if (clipNow[i] === v) return;
    clipNow[i] = v;
    els[i].style.clipPath = v;
  }

  function apply(edge: Float32Array | null, gap: number): void {
    const s = at(window.scrollY), W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < els.length; i++) {
      if (s.k && (i === s.k || i === s.k - 1)) continue;
      setClip(i, !s.k && i === s.cur ? '' : HIDE);
    }
    if (!s.k) return;
    // the skyline in 8px steps, right to left, snapped to the background's cells
    const pts: [number, number][] = [];
    if (edge) {
      const step = Math.max(1, Math.round(8 / gap)), n = edge.length;
      for (let c = Math.floor((n - 1) / step) * step; c >= 0; c -= step) {
        const yb = Math.ceil((edge[c] - gap / 2) / gap) * gap;
        pts.push([Math.min(W + 20, (c + step) * gap), yb], [c * gap, yb]);
      }
      pts[0][0] = W + 20;
      pts[pts.length - 1][0] = -20;
    } else {
      const ey = H * (1 - s.p);
      pts.push([W + 20, ey], [-20, ey]);
    }
    const poly = (el: HTMLElement, cy: number): string => {
      const r = el.getBoundingClientRect();
      const f = (x: number, y: number): string => (x - r.left).toFixed(1) + 'px ' + (y - r.top).toFixed(1) + 'px';
      return 'polygon(' + f(-20, cy) + ',' + f(W + 20, cy) + ',' + pts.map((q) => f(q[0], q[1])).join(',') + ')';
    };
    setClip(s.k - 1, poly(els[s.k - 1], -40));   // the outgoing section keeps what is above the edge
    setClip(s.k, poly(els[s.k], H + 40));        // the incoming one shows below it
  }

  // a section's own resting stretch: from the end of its reveal to the start of the next one
  const rest = (i: number): { lo: number; hi: number } => ({
    lo: i ? tops[i] + tx : 0,
    hi: i + 1 < els.length ? tops[i + 1] : Infinity,
  });
  const sceneOf = (hash: string): number => els.findIndex((el) => '#' + el.id === hash);

  measure();
  apply(null, 0);
  window.addEventListener('scroll', () => { if (!backgroundLive) apply(null, 0); }, { passive: true });
  window.addEventListener('resize', () => { measure(); apply(null, 0); });
  void document.fonts.ready.then(measure);

  // links to a section land where it is fully revealed, not where its reveal starts
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
    if (!a) return;
    const i = sceneOf(a.getAttribute('href') ?? '');
    if (i < 0) return;
    e.preventDefault();
    window.scrollTo({ top: rest(i).lo, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
  });
  // keyboard focus moving into a section that is not on screen brings it on screen
  document.addEventListener('focusin', (e) => {
    const i = els.findIndex((el) => el.contains(e.target as Node));
    if (i < 0) return;
    const y = window.scrollY, r = rest(i);
    if (y < r.lo || y > r.hi) window.scrollTo({ top: y < r.lo ? r.lo : r.hi, behavior: 'instant' });
  });
  if (location.hash) {
    const i = sceneOf(location.hash);
    if (i > 0) window.addEventListener('load', () => window.scrollTo({ top: rest(i).lo, behavior: 'instant' }));
  }

  return {
    els,
    tx: () => tx,
    top: (i) => tops[i],
    index: (id) => els.findIndex((el) => el.id === id),
    at,
    apply,
    takeOver: () => { backgroundLive = true; },
  };
}
