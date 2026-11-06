// A small pixel dot that trails the mouse. In the hero it also carries the label of the service under the pointer.
import { byId } from '../core/dom';

export interface Cursor {
  setLabel(text: string): void;
  setHot(on: boolean): void;
}

export function createCursor(): Cursor {
  const cur = byId('cur'), label = byId('curLb');
  let mx = -100, my = -100, cx = -100, cy = -100, seen = false;
  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (!seen) { cx = mx; cy = my; seen = true; }
    cur.classList.add('on');
  });
  document.documentElement.addEventListener('mouseleave', () => cur.classList.remove('on'));
  const tick = (): void => {
    if (Math.abs(mx - cx) + Math.abs(my - cy) > 0.1) {      // idle mouse: no style writes
      cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2;
      cur.style.transform = 'translate3d(' + (cx + 14).toFixed(1) + 'px,' + (cy + 14).toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(tick);
  };
  tick();
  return {
    setLabel: (text) => { label.textContent = text; },
    setHot: (on) => { cur.classList.toggle('hot', on); },
  };
}
