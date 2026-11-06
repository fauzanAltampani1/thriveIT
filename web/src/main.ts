// Composition root: load the styles, build each section, and drive them all from one scroll handler.
import '@fontsource/dotgothic16/latin-400.css';
import '@fontsource/space-mono/latin-400.css';
import '@fontsource/space-mono/latin-700.css';
import './styles/tokens.css';
import './styles/scenes.css';
import './styles/base.css';
import './styles/background.css';
import './styles/hero.css';
import './styles/section.css';
import './styles/dossier.css';
import './styles/workflow.css';
import './styles/current-work.css';
import './styles/connect.css';
import './styles/footer.css';
import './styles/cursor.css';
import './styles/motion.css';

import { SCENE_IDS } from './config';
import { paintIcons } from './core/pixel';
import { createBackground } from './features/background';
import { createConnect } from './features/connect';
import { createCurrentWork } from './features/currentWork';
import { createCursor } from './features/cursor';
import { createDossier } from './features/dossier';
import { createHero } from './features/hero/hero';
import { createScenes } from './features/scenes';
import { createWorkflow } from './features/workflow';

paintIcons();
const scenes = createScenes(SCENE_IDS);
const cursor = createCursor();
const hero = createHero(scenes, cursor);
createBackground(scenes);
const dossier = createDossier(scenes);
const workflow = createWorkflow(scenes);
const work = createCurrentWork(scenes);
createConnect();

// one read of the scroll position per frame, however many scroll events arrive
let ticking = false;
function onScroll(): void {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    hero.update();
    dossier.update();
    workflow.update();
    work.update();
  });
}
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', () => { hero.fit(); work.measure(); onScroll(); });
void document.fonts.ready.then(() => hero.fit());
