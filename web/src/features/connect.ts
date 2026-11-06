// 05 · Connect: a sealed airmail envelope. Breaking the seal pulls out the letter, which unfolds into the inquiry form;
// "Fold back" plays the same film backwards and keeps what was typed. The form builds a message the visitor sends
// themselves on WhatsApp or by email: nothing is posted to a server.
import { CONTACT } from '../config';
import { byId, qs } from '../core/dom';
import { logoInner, sealMark } from '../core/glyphs';
import { reducedMotion } from '../core/motion';

const EASE = 'cubic-bezier(.2,.8,.2,1)';
const REQUIRED: readonly [id: string, label: string][] = [['f-name', 'nama'], ['f-contact', 'kontak'], ['f-sum', 'ringkasan proyek']];

export function createConnect(): void {
  const waNum = byId('waNum'), waLink = byId<HTMLAnchorElement>('waLink');
  if (CONTACT.waNumber) {
    waNum.textContent = '+' + CONTACT.waNumber;
    waLink.href = 'https://wa.me/' + CONTACT.waNumber;
    waLink.hidden = false;
  }
  byId('mailAddr').textContent = CONTACT.email;
  // envelope art: the wordmark on the front, "_t" pressed into the wax; the logo again in the footer
  qs('.env-logo').innerHTML = logoInner(false);
  qs('.seal-t').innerHTML = sealMark();
  byId('footLogo').innerHTML = logoInner(false);

  const env = byId('env'), seal = byId<HTMLButtonElement>('seal'), sheet = byId('sheet'), peek = byId('peek');
  const envHint = byId('envHint'), foldBack = byId<HTMLButtonElement>('foldBack');
  let lettered = false, busy = false;

  // where the risen letter sits, and how much of it shows above the pocket
  function peekFrame(): { top: number; shown: number } {
    const er = env.getBoundingClientRect(), pr = peek.getBoundingClientRect();
    return { top: pr.top, shown: Math.max(24, er.top + er.height * 0.2 - pr.top) };
  }
  function pinEnvelope(width: number): void {
    Object.assign(env.style, { position: 'absolute', top: env.offsetTop + 'px', left: '0', right: '0', margin: '0 auto', width: width + 'px' });
  }
  function unpinEnvelope(): void {
    (['position', 'top', 'left', 'right', 'margin', 'width'] as const).forEach((k) => { env.style[k] = ''; });
  }
  function clearSheetMotion(): void { sheet.style.transition = ''; sheet.style.transform = ''; sheet.style.clipPath = ''; }
  // the sheet starts where the risen paper is, showing only the part that was out of the pocket
  function sheetToPaper(f = peekFrame()): void {
    const sr = sheet.getBoundingClientRect();
    sheet.style.transform = 'translateY(' + (f.top - sr.top).toFixed(1) + 'px)';
    sheet.style.clipPath = 'inset(0 0 ' + Math.max(0, sr.height - f.shown).toFixed(1) + 'px 0)';
  }

  seal.addEventListener('click', () => {
    if (lettered || busy) return;
    lettered = true; busy = true;
    seal.setAttribute('aria-expanded', 'true');
    env.classList.remove('reseal');
    const finish = (): void => {
      env.hidden = true;
      envHint.hidden = true;
      clearSheetMotion();
      busy = false;
      byId('f-name').focus({ preventScroll: true });
    };
    if (reducedMotion.matches) { sheet.hidden = false; finish(); return; }
    // 1. the seal cracks, the flap swings up, the letter rises out of the pocket (timed in CSS)
    env.classList.add('open');
    envHint.classList.add('away');
    window.setTimeout(() => {
      // 2. the envelope leaves the flow where it stands; the full letter takes its place
      const f = peekFrame();
      pinEnvelope(env.getBoundingClientRect().width);
      sheet.hidden = false;
      sheet.style.transition = 'none';
      sheetToPaper(f);
      void sheet.offsetWidth;
      // 3. the paper settles and unfolds to full length while the envelope drops away
      sheet.style.transition = 'transform .8s ' + EASE + ', clip-path .8s ' + EASE;
      sheet.style.transform = 'none';
      sheet.style.clipPath = 'inset(0 0 0 0)';
      env.classList.add('away');
      window.setTimeout(finish, 850);
    }, 1350);
  });

  // the same film, backwards: the letter folds into the envelope, the flap closes, the seal is pressed again
  function closeLetter(): void {
    if (!lettered || busy) return;
    busy = true;
    const finish = (): void => {
      lettered = false; busy = false;
      env.classList.remove('reseal');
      seal.setAttribute('aria-expanded', 'false');
      seal.focus({ preventScroll: true });
    };
    if (reducedMotion.matches) {
      sheet.hidden = true; env.hidden = false; envHint.hidden = false;
      env.classList.remove('open', 'away'); envHint.classList.remove('away');
      unpinEnvelope();
      finish();
      return;
    }
    // 1. bring the open envelope back behind the letter (seal kept away until it is pressed again) and fold the letter down
    env.classList.add('sealgone');
    env.hidden = false;
    void env.offsetWidth;
    env.classList.remove('away');
    sheet.style.transition = 'transform .7s ' + EASE + ', clip-path .7s ' + EASE;
    sheetToPaper();
    window.setTimeout(() => {
      // 2. hand over to the paper inside the envelope; put the envelope back in the flow
      sheet.hidden = true;
      clearSheetMotion();
      unpinEnvelope();
      envHint.hidden = false;
      // 3. paper slides in, flap closes, seal stamps (timed in CSS)
      env.classList.remove('open', 'sealgone');
      env.classList.add('reseal');
      envHint.classList.remove('away');
      window.setTimeout(finish, 1500);
    }, 720);
  }
  foldBack.addEventListener('click', closeLetter);
  sheet.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); closeLetter(); } });

  // copy to the clipboard; where that is refused, select the text so the visitor can copy it
  function copyText(text: string, btn: HTMLElement, label: string, selectEl: HTMLElement): void {
    const done = (msg: string): void => { btn.textContent = msg; window.setTimeout(() => { btn.textContent = label; }, 1600); };
    const fallback = (): void => {
      const r = document.createRange();
      r.selectNodeContents(selectEl);
      const s = window.getSelection();
      s?.removeAllRanges(); s?.addRange(r);
      done('Terpilih');
    };
    try {
      if (!navigator.clipboard) { fallback(); return; }
      navigator.clipboard.writeText(text).then(() => done('Tersalin'), fallback);
    } catch { fallback(); }
  }
  const copyMail = byId<HTMLButtonElement>('copyMail');
  copyMail.addEventListener('click', () => copyText(CONTACT.email, copyMail, 'Salin', byId('mailAddr')));

  const inq = byId<HTMLFormElement>('inq'), inqErr = byId('inqErr'), ready = byId('ready'), msgEl = byId('msg');
  const sendWa = byId<HTMLAnchorElement>('sendWa'), sendMail = byId<HTMLAnchorElement>('sendMail'), copyMsg = byId<HTMLButtonElement>('copyMsg');
  const field = (id: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => byId(id);
  const val = (id: string): string => field(id).value.trim();

  inq.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = REQUIRED.filter((r) => !val(r[0]));
    REQUIRED.forEach((r) => field(r[0]).setAttribute('aria-invalid', String(!val(r[0]))));
    if (missing.length) {
      inqErr.textContent = 'Isi ' + missing.map((m) => m[1]).join(', ') + ' dulu supaya kami bisa membalas.';
      inqErr.hidden = false;
      ready.hidden = true;
      field(missing[0][0]).focus();
      return;
    }
    inqErr.hidden = true;
    const msg = [
      'Pesan untuk ThrivIT',
      'Nama: ' + val('f-name'),
      'Usaha: ' + (val('f-co') || '-'),
      'Kontak: ' + val('f-contact'),
      'Layanan: ' + field('f-svc').value,
      '',
      val('f-sum'),
    ].join('\n');
    msgEl.textContent = msg;
    sendMail.href = 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent('Proyek baru: ' + val('f-name')) + '&body=' + encodeURIComponent(msg);
    if (CONTACT.waNumber) { sendWa.href = 'https://wa.me/' + CONTACT.waNumber + '?text=' + encodeURIComponent(msg); sendWa.hidden = false; }
    else sendWa.hidden = true;
    ready.hidden = false;
    ready.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });
  copyMsg.addEventListener('click', () => copyText(msgEl.textContent ?? '', copyMsg, '[ Salin pesan ]', msgEl));
}
