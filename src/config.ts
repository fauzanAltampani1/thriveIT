// Everything you are likely to tune lives here. Copy (words) lives in src/content and index.html.

export const CONTACT = {
  /** WhatsApp: country code + number, no "+" (e.g. '6281234567890'). Empty shows [NOMOR WA] and hides the WhatsApp buttons. */
  waNumber: '',
  email: 'itthrived@gmail.com',
  /** the contact form posts here (functions/api/inquiry.ts); if it fails, the visitor sends the message themselves */
  endpoint: '/api/inquiry',
} as const;

/** The sections, top to bottom (element ids). One fills the screen at a time; a torn edge swaps them as you scroll. */
export const SCENE_IDS = ['top', 'dossier', 'workflow', 'work', 'connect'] as const;

/** Glyph smoke: a grid of tiny "ThrivIT" letters drifting along the bottom of the screen. */
export const WAVE = {
  band: 0.25,        // typical smoke height as a share of the screen, from the bottom
  cellW: 5,          // glyph grid cell width, CSS px
  cellH: 8,          // glyph grid cell height, CSS px
  fontPx: 7,         // glyph size, CSS px
  shade: 50,         // resting gray (0–255) of the densest glyphs; thinner areas dither darker
  tint: 0.35,        // how much of the smoke leans dim teal, 0–1
  speed: 14,         // drift, CSS px per second, right → left
  fade: 0.05,        // how fast whole regions dissolve and grow back; lower = slower
  fps: 30,           // redraw rate (drops to 20 on devices that can't keep up)
  mouseRadius: 160,  // reach of the cursor, CSS px
  mousePush: 26,     // how far the cursor bends and lifts the smoke, CSS px
  mouseGlow: 70,     // extra gray right under the cursor
} as const;

/** Page colours and the torn edge between sections. */
export const FIELD = {
  light: ['dossier', 'work'] as readonly string[],   // sections painted white; the rest are black
  rough: 70,         // height of the torn skyline mid-screen, px
  jag: 10,           // small teeth along the edge, px
  fringe: 90,        // width of the dithered band either side of the edge, px
  islands: 110,      // how far loose fragments break off the edge, px
  stir: 2.2,         // extra roughness per px/frame of scroll speed
  maxStir: 90,       // cap on that extra roughness, px
  spring: 0.08,      // how quickly the edge reacts to scroll speed
  damp: 0.82,        // how quickly it calms once you stop (higher = longer turbulence)
} as const;
