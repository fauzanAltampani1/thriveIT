// The _thrivit logo: glitch reveal, a hold with occasional small glitches, then a glitch exit; loops when asked.
// Every frame is a set of horizontal slices of the logo, shifted sideways, plus two colour ghosts and a few noise blocks.
import { logoSVG } from '../../core/glyphs';
import { reducedMotion } from '../../core/motion';

export interface Glitch {
  /** reveal after `delay` ms */
  show(delay: number): void;
  /** play a short exit; returns how long it takes in ms */
  hide(): number;
  setLoop(on: boolean): void;
}

interface Band { vis: boolean; t: number; b: number; dx: number }
interface NoiseBlock { x: number; y: number; w: number; h: number; white: boolean }
interface Frame {
  base: boolean;
  squash?: string;
  bands?: Band[];
  split?: number;
  c1?: number;
  c2?: number;
  dy?: number;
  noise?: NoiseBlock[];
}
interface FrameOptions { vis: number; shiftP: number; shiftMag: number; split: number; noise: number }
type Sequence = [paint: () => void, ms: number][];

const N_BANDS = 8, N_NOISE = 6, HOLD = 3600, LOOP_GAP = 700;
const CLEAN: Frame = { base: true }, HIDDEN: Frame = { base: false };
const rnd = (a: number, b: number): number => a + Math.random() * (b - a);
const sgn = (): number => (Math.random() < 0.5 ? -1 : 1);

// n horizontal slices with edges on a 4% grid
function cuts(n: number): [number, number][] {
  const set = new Set<number>();
  while (set.size < n - 1) set.add(4 * (1 + Math.floor(Math.random() * 24)));
  const p = [0, ...Array.from(set).sort((a, b) => a - b), 100];
  const out: [number, number][] = [];
  for (let i = 0; i < n; i++) out.push([p[i], p[i + 1]]);
  return out;
}

function frame(o: FrameOptions): Frame {
  const n = 4 + Math.floor(Math.random() * (N_BANDS - 3));
  return {
    base: false,
    bands: cuts(n).map((c) => ({ vis: Math.random() < o.vis, t: c[0], b: c[1], dx: Math.random() < o.shiftP ? sgn() * rnd(0.3, 1) * o.shiftMag : 0 })),
    split: o.split, c1: rnd(0.55, 0.9), c2: rnd(0.2, 0.45),
    dy: Math.random() < 0.3 ? sgn() * rnd(0.5, 2.5) : 0,
    noise: Array.from({ length: Math.min(N_NOISE, o.noise) }, () => ({ x: rnd(-4, 98), y: rnd(-8, 90), w: rnd(1.2, 6), h: rnd(3, 9), white: Math.random() < 0.3 })),
  };
}

export function createGlitch(root: HTMLElement): Glitch {
  let html = logoSVG('gl-ch gl-c2', true) + logoSVG('gl-ch gl-c1', true) + logoSVG('gl-base', false);
  for (let i = 0; i < N_BANDS; i++) html += logoSVG('gl-band', false);
  for (let i = 0; i < N_NOISE; i++) html += '<i class="gl-nz"></i>';
  root.innerHTML = html;
  const c1 = root.querySelector<SVGElement>('.gl-c1')!, c2 = root.querySelector<SVGElement>('.gl-c2')!;
  const bands = Array.from(root.querySelectorAll<SVGElement>('.gl-band'));
  const noise = Array.from(root.querySelectorAll<HTMLElement>('.gl-nz'));

  function paint(f: Frame): void {
    root.classList.toggle('off', !f.base);
    root.style.transform = f.squash ?? '';
    for (let i = 0; i < N_BANDS; i++) {
      const s = f.bands?.[i], el = bands[i];
      if (s && s.vis) {
        el.style.visibility = 'visible';
        el.style.clipPath = 'inset(' + s.t + '% 0 ' + (100 - s.b) + '% 0)';
        el.style.transform = 'translateX(' + s.dx.toFixed(2) + '%)';
      } else el.style.visibility = 'hidden';
    }
    const sp = f.split ?? 0, dy = f.dy ?? 0;
    c1.style.opacity = String(sp ? f.c1 ?? 0 : 0);
    c2.style.opacity = String(sp ? f.c2 ?? 0 : 0);
    c1.style.transform = 'translate(' + (-sp).toFixed(2) + '%,' + dy.toFixed(2) + '%)';
    c2.style.transform = 'translate(' + sp.toFixed(2) + '%,' + (-dy).toFixed(2) + '%)';
    for (let i = 0; i < N_NOISE; i++) {
      const s = f.noise?.[i], el = noise[i];
      if (s) {
        el.style.visibility = 'visible';
        el.style.left = s.x.toFixed(1) + '%'; el.style.top = s.y.toFixed(1) + '%';
        el.style.width = s.w.toFixed(1) + '%'; el.style.height = s.h.toFixed(1) + '%';
        el.classList.toggle('w', s.white);
      } else el.style.visibility = 'hidden';
    }
  }

  function revealSeq(): Sequence {
    const s: Sequence = [], steps = 14;
    for (let i = 0; i < steps; i++) {
      const p = (i + 1) / steps;
      s.push([() => paint(p < 0.4 && Math.random() < 0.3 ? HIDDEN : frame({ vis: 0.12 + 0.88 * p, shiftP: 0.15 + 0.75 * (1 - p), shiftMag: 1.5 + 10 * (1 - p), split: 0.3 + 2.2 * (1 - p), noise: Math.round((1 - p) * N_NOISE * rnd(0.4, 1)) })), Math.round(rnd(40, 65))]);
    }
    s.push([() => paint(frame({ vis: 1, shiftP: 0.2, shiftMag: 1, split: 0.35, noise: 0 })), 70]);
    s.push([() => paint(CLEAN), 0]);
    return s;
  }
  function microSeq(): Sequence {
    const s: Sequence = [], k = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < k; i++) s.push([() => paint(frame({ vis: 1, shiftP: 0.3, shiftMag: rnd(0.8, 3.5), split: rnd(0.25, 0.9), noise: Math.random() < 0.4 ? 1 : 0 })), Math.round(rnd(40, 70))]);
    s.push([() => paint(CLEAN), 0]);
    return s;
  }
  function exitSeq(steps: number): Sequence {
    const s: Sequence = [];
    for (let i = 0; i < steps; i++) {
      const p = (i + 1) / steps;
      s.push([() => paint(p > 0.55 && Math.random() < 0.22 ? HIDDEN : frame({ vis: 1 - 0.75 * p, shiftP: 0.3 + 0.6 * p, shiftMag: 2 + 12 * p, split: 0.5 + 2.5 * p, noise: Math.round(p * N_NOISE * rnd(0.5, 1)) })), Math.round(rnd(40, 60))]);
    }
    s.push([() => paint({ base: true, squash: 'scale(1.06, 0.06)', split: 0.8, c1: 0.9, c2: 0.4 }), 55]);
    s.push([() => paint({ base: true, squash: 'scale(0.3, 0.03)' }), 45]);
    s.push([() => paint(HIDDEN), 0]);
    return s;
  }
  const total = (seq: Sequence): number => seq.reduce((sum, f) => sum + f[1], 0);

  let phase: 'hidden' | 'wait' | 'reveal' | 'hold' | 'exit' | 'gap' | 'leave' = 'hidden';
  let loop = true, token = 0, tf = 0, tw = 0, tm = 0;
  function clear(): void { token++; clearTimeout(tf); clearTimeout(tw); clearTimeout(tm); }
  function play(seq: Sequence, done?: () => void): void {
    const my = token;
    let i = 0;
    const step = (): void => {
      if (my !== token) return;
      if (i >= seq.length) { done?.(); return; }
      const f = seq[i++];
      f[0]();
      if (f[1] > 0) tf = window.setTimeout(step, f[1]); else step();
    };
    step();
  }
  function reveal(): void { phase = 'reveal'; play(reducedMotion.matches ? [[() => paint(CLEAN), 0]] : revealSeq(), hold); }
  function hold(): void { phase = 'hold'; scheduleMicro(); if (loop) scheduleExit(HOLD); }
  function scheduleMicro(): void {
    if (reducedMotion.matches) return;
    const my = token;
    tm = window.setTimeout(() => { if (my === token) play(microSeq(), scheduleMicro); }, rnd(900, 1900));
  }
  function scheduleExit(ms: number): void {
    const my = token;
    clearTimeout(tw);
    tw = window.setTimeout(() => { if (my === token) exitLoop(); }, ms);
  }
  function exitLoop(): void {
    clear();
    phase = 'exit';
    play(reducedMotion.matches ? [[() => paint(HIDDEN), 0]] : exitSeq(11), () => {
      phase = 'gap';
      const my = token;
      tw = window.setTimeout(() => { if (my === token) reveal(); }, LOOP_GAP);
    });
  }

  return {
    show(delay) {
      clear(); paint(HIDDEN); phase = 'wait';
      const my = token;
      tw = window.setTimeout(() => { if (my === token) reveal(); }, delay);
    },
    hide() {
      const shown = phase === 'reveal' || phase === 'hold';
      clear();
      if (!shown || reducedMotion.matches) { paint(HIDDEN); phase = 'hidden'; return 0; }
      phase = 'leave';
      const seq = exitSeq(4);
      play(seq, () => { phase = 'hidden'; });
      return total(seq);
    },
    setLoop(on) {
      loop = on;
      if (phase === 'hold') { if (on) scheduleExit(2400); else clearTimeout(tw); }
      else if (!on && (phase === 'exit' || phase === 'gap')) { clear(); reveal(); }
    },
  };
}
