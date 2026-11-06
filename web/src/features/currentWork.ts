// 04 · Current work: giant rolling words sit behind ("_current" / "work"), and the project's cards stack over them.
// Each card shrinks a little and darkens for every card that lands on top of it.
import { byId, qs, qsa } from '../core/dom';
import { glyphSVG } from '../core/glyphs';
import { reducedMotion } from '../core/motion';
import type { Scenes } from './scenes';

export interface CurrentWork {
  update(): void;
  /** re-read the sticky geometry (resize) */
  measure(): void;
}

// rolling text: every glyph rolls through a copy of itself; the stagger runs from the centre of the word out to its edges
function rollWord(word: string, base: number): string {
  const mid = (word.length - 1) / 2;
  return Array.from(word).map((c, i) => {
    const g = glyphSVG(c);
    return '<span class="rc' + (c === '_' ? ' acc' : '') + '" style="--d:' + (base + Math.round(Math.abs(i - mid) * 70)) + 'ms"><span class="rs">' + g + g + '</span></span>';
  }).join('');
}

export function createCurrentWork(scenes: Scenes): CurrentWork {
  byId('cwTop').innerHTML = rollWord('_current', 0);
  byId('cwBot').innerHTML = rollWord('work', 220);
  const back = qs('.cw-back'), box = byId('cwCards');
  const slots = qsa('#cwCards .cw-slot');
  const cards = slots.map((s) => qs('.card', s));
  const scene = scenes.index('work');
  let rolled: boolean | null = null, pad = 0, stickTop = 0, slotH = 0;

  // the words roll in a quarter of the way into the section's reveal (before the first card), and back out above it
  function roll(): void {
    const want = reducedMotion.matches || window.scrollY > scenes.top(scene) + scenes.tx() * 0.25;
    if (want !== rolled) { rolled = want; back.classList.toggle('rolled', want); }
  }
  function measure(): void {
    pad = parseFloat(getComputedStyle(box).paddingTop) || 0;
    stickTop = parseFloat(getComputedStyle(slots[0]).top) || 0;
    slotH = slots[0].offsetHeight;
  }
  function update(): void {
    roll();
    if (!slotH) measure();
    if (!slotH) return;
    const s = stickTop - (box.getBoundingClientRect().top + pad), n = cards.length;   // px scrolled since the first card stuck
    cards.forEach((c, i) => {
      const k = Math.max(0, Math.min(n - 1 - i, (s - i * slotH) / slotH));
      c.style.transform = reducedMotion.matches ? '' : 'scale(' + (1 - 0.035 * k).toFixed(4) + ')';
      c.style.setProperty('--shade', Math.min(0.6, 0.2 * k).toFixed(3));
    });
  }

  update();
  return { update, measure };
}
