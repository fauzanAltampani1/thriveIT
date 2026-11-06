// The visitor's reduced-motion setting, read live so a change while the page is open takes effect.

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Scroll behaviour for script-driven jumps. */
export const jumpBehavior = (): ScrollBehavior => (reducedMotion.matches ? 'auto' : 'smooth');
