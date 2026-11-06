// Small DOM helpers. Lookups fail loudly, so a renamed id in index.html shows up at once instead of as a silent no-op.

export function byId<T extends Element = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error('#' + id + ' is missing from index.html');
  return el as unknown as T;
}

export function qs<T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(selector + ' is missing from index.html');
  return el;
}

export const qsa = <T extends Element = HTMLElement>(selector: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

export const esc = (s: unknown): string => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export const pad2 = (n: number): string => (n < 10 ? '0' : '') + n;

/** Replays a CSS animation class: remove, force a reflow, add. */
export function replayClass(el: HTMLElement, cls: string): void {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
