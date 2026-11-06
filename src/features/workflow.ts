// 03 · Workflow: pinned. Scroll rolls a 3D drum of short lines; the panel and the step list follow the step at the centre.
// The drum eases toward the scroll position, so fast flicks still roll smoothly. Clicking a step rolls the page to it.
import { STEPS } from '../content/workflow';
import { byId, esc, pad2 } from '../core/dom';
import { reducedMotion } from '../core/motion';
import { iconPath } from '../core/pixel';
import type { Scenes } from './scenes';

export interface Workflow {
  update(): void;
}

interface Line { t: string; si: number; kw: boolean }
const STEP_DEG = 20;                                  // angle between neighbouring lines on the drum

export function createWorkflow(scenes: Scenes): Workflow {
  const LINES: Line[] = [];
  STEPS.forEach((s, si) => s.lines.forEach((t, k) => LINES.push({ t, si, kw: k === 0 })));
  const LAST = LINES.length - 1;
  const PER = LINES.length / STEPS.length;            // lines per step

  const drum = byId('drum');
  drum.innerHTML = LINES.map((l) => '<div class="ln' + (l.kw ? ' kw' : '') + '">' + esc(l.t) + '</div>').join('');
  const lnEls = Array.from(drum.children) as HTMLElement[];
  const wTrack = byId('wTrack'), wStage = byId('wStage'), wCur = byId('wCur'), wNowT = byId('wNowT');
  const wIco = byId('wIco'), wStepN = byId('wStepN'), wTitle = byId('wTitle'), wDesc = byId('wDesc'), wOut = byId('wOut');
  const wBtns = Array.from(byId('wList').querySelectorAll<HTMLButtonElement>('.wf-li'));
  wBtns.forEach((b) => { const mb = b.querySelector('.mb'); if (mb) mb.innerHTML = '<i></i>'.repeat(10); });
  const wBlocks = wBtns.map((b) => Array.from(b.querySelectorAll('.mb i')));
  let rTarget = 0, rCur = 0, wStep = -1, wLit = -1, wRaf = 0, radius = 0, lineH = 0;

  function metrics(): { total: number; cur: number } {
    const tr = wTrack.getBoundingClientRect(), tx = scenes.tx();   // --tx at each end holds still for the swaps
    return { total: tr.height - wStage.offsetHeight - 2 * tx, cur: -tr.top - tx };
  }
  function measureDrum(): void {
    lineH = drum.offsetHeight || 76;
    radius = lineH / (2 * Math.tan(STEP_DEG * Math.PI / 360));
  }

  function renderDrum(): void {
    for (let i = 0; i < lnEls.length; i++) {
      const el = lnEls[i], d = i - rCur;
      if (reducedMotion.matches) {                    // reduced motion: a flat list that slides, no rotation
        const vis = Math.abs(d) < 4.5;
        el.style.visibility = vis ? 'visible' : 'hidden';
        if (vis) { el.style.transform = 'translateY(' + (d * lineH).toFixed(1) + 'px)'; el.style.opacity = Math.max(0.12, 1 - Math.abs(d) * 0.22).toFixed(2); }
        continue;
      }
      const a = d * STEP_DEG;
      if (Math.abs(a) > 96) { el.style.visibility = 'hidden'; continue; }
      el.style.visibility = 'visible';
      el.style.transform = 'translateZ(' + (-radius).toFixed(1) + 'px) rotateX(' + (-a).toFixed(2) + 'deg) translateZ(' + radius.toFixed(1) + 'px)';
      el.style.opacity = Math.max(0.06, Math.pow(Math.max(0, Math.cos(a * Math.PI / 180)), 1.4)).toFixed(3);
    }
  }

  function updatePanel(): void {
    const s = Math.max(0, Math.min(STEPS.length - 1, Math.floor(Math.round(rCur) / PER)));
    const lit = Math.round(rCur / LAST * 50);
    if (lit !== wLit) {
      wLit = lit;
      wBlocks.forEach((row, si) => row.forEach((b, bi) => b.classList.toggle('on', si * 10 + bi < lit)));
    }
    if (s === wStep) return;
    const first = wStep < 0;
    wStep = s;
    const st = STEPS[s];
    lnEls.forEach((el, i) => el.classList.toggle('on', LINES[i].kw && LINES[i].si === s));
    wBtns.forEach((b, k) => {
      b.classList.toggle('on', k === s);
      b.classList.toggle('done', k < s);
      if (k === s) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    wNowT.textContent = pad2(s + 1) + ' / ' + st.name.toUpperCase();
    wIco.innerHTML = iconPath(st.icon);
    wStepN.textContent = 'STEP ' + pad2(s + 1) + ' / ' + pad2(STEPS.length);
    wTitle.textContent = st.name;
    wDesc.textContent = st.desc;
    wOut.textContent = 'Hasil // ' + st.out;
    if (!first && !reducedMotion.matches) { wCur.classList.remove('swap'); void wCur.offsetWidth; wCur.classList.add('swap'); }
  }

  function tick(): void {
    wRaf = 0;
    const diff = rTarget - rCur;
    rCur = reducedMotion.matches || Math.abs(diff) < 0.002 ? rTarget : rCur + diff * 0.14;
    renderDrum();
    updatePanel();
    if (rCur !== rTarget) wRaf = requestAnimationFrame(tick);
  }
  function update(): void {
    const m = metrics();
    if (m.total <= 0) return;
    rTarget = Math.max(0, Math.min(1, m.cur / m.total)) * LAST;
    if (!wRaf) wRaf = requestAnimationFrame(tick);
  }
  // a click rolls the page to that step's first line
  wBtns.forEach((b, k) => b.addEventListener('click', () => {
    const m = metrics();
    window.scrollBy({ top: (k * PER) / LAST * m.total - m.cur, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }));

  measureDrum();
  window.addEventListener('resize', () => { measureDrum(); renderDrum(); });
  void document.fonts.ready.then(() => { measureDrum(); renderDrum(); });
  update();
  return { update };
}
