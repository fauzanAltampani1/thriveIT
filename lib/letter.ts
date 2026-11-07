// The ThrivIT letter, shared by the email functions (functions/api/*.ts). It mirrors the paper on the site: a black
// masthead with the wordmark, the airmail edge of the envelope, then light paper with dark ink.
// Email clients are picky, so this is table layout with inline styles only, and NO external images: Gmail hides
// images from new senders and in Spam, so the wordmark is styled text and the airmail stripe is a row of table cells.

export const INK = '#04292d', PAPER = '#e9f6f7', SOFT = '#3e6266', LINE = '#c5dfe2', AC = '#0ECEE1';
export const MONO = "'Space Mono','SFMono-Regular',Menlo,Consolas,'Courier New',monospace";
export const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;

export const oneLine = (s: string): string => s.replace(/[\r\n\t]+/g, ' ').trim();
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const para = (s: string): string => esc(s.trim()).replace(/\r?\n/g, '<br>');
// Gmail turns anything that looks like a domain into a link; a zero-width space keeps a label a label
const noLink = (s: string): string => s.replace(/\./g, '&#8203;.');

/** an Indonesian phone number written any common way → 62xxxxxxxxxx for wa.me, or '' if it is not one */
export function waNumber(s: string): string {
  const d = s.replace(/[^\d+]/g, '');
  if (/^\+?62\d{8,13}$/.test(d)) return d.replace('+', '');
  if (/^0\d{8,13}$/.test(d)) return '62' + d.slice(1);
  return '';
}

export function nowWIB(): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }).format(new Date()) + ' WIB';
  } catch {
    return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }
}

/* ---------- building blocks ---------- */
const WORDMARK =
  '<span style="font:700 26px/1 ' + MONO + ';letter-spacing:1px;color:#fafafa;">_thr<span style="color:' + AC + ';">i</span>v<span style="color:' + AC + ';">i</span>t</span>';

// the envelope's airmail edge: cyan, black, grey, black, repeated
function stripe(): string {
  const cell = (w: number, c: string): string => '<td width="' + w + '" height="8" style="height:8px;font-size:0;line-height:0;background:' + c + ';">&nbsp;</td>';
  let cells = '';
  for (let i = 0; i < 15; i++) cells += cell(14, AC) + cell(6, '#000000') + cell(14, '#4a4a4a') + cell(6, '#000000');
  return '<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;table-layout:fixed;"><tr>' + cells + '</tr></table></td></tr>';
}

const label = (s: string, color = SOFT): string =>
  '<p style="margin:0 0 10px;font:700 11px/1.5 ' + MONO + ';letter-spacing:1.5px;color:' + color + ';">' + s + '</p>';

function button(href: string, text: string): string {
  return '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>' +
    '<td style="background:' + INK + ';"><a href="' + esc(href) + '" style="display:inline-block;padding:14px 22px;font:700 13px/1 ' + MONO + ';letter-spacing:1px;text-transform:uppercase;color:' + PAPER + ';text-decoration:none;">' + text + '</a></td>' +
    '</tr></table>';
}

function topRow(left: string, right: string): string {
  const td = 'padding-bottom:12px;border-bottom:2px solid ' + INK + ';font:700 11px/1.4 ' + MONO + ';letter-spacing:1.5px;';
  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td style="' + td + 'color:' + INK + ';">' + left + '</td><td align="right" style="' + td + 'color:' + SOFT + ';">' + right + '</td></tr></table>';
}

/** the whole letter: preview line (inbox snippet), the paper's content, and the small print under it */
function shell(title: string, preview: string, paper: string, footer: string): string {
  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>' + esc(title) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">' +
    '<style>@media (max-width:520px){.pad{padding:28px 22px 26px!important}}</style></head>' +
    '<body style="margin:0;padding:0;background:#efeee9;">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + preview + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efeee9;"><tr><td align="center" style="padding:32px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">' +
      '<tr><td style="height:4px;line-height:4px;font-size:0;background:' + AC + ';">&nbsp;</td></tr>' +
      '<tr><td align="center" style="background:#000000;padding:24px;">' + WORDMARK + '</td></tr>' +
      stripe() +
      '<tr><td class="pad" style="background:' + PAPER + ';padding:36px 40px 32px;">' + paper + '</td></tr>' +
      stripe() +
      '<tr><td style="padding:20px 8px 0;font:400 11px/1.7 ' + MONO + ';color:#7a7a72;text-align:center;">' + footer + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

/* ---------- 1. a new inquiry from the site's form, to us ---------- */
export interface Inquiry { name: string; company: string; contact: string; service: string; summary: string }

export function inquiryHtml(f: Inquiry, base: string, when: string): string {
  const contact = oneLine(f.contact), isMail = EMAIL.test(contact), wa = isMail ? '' : waNumber(contact);
  const direct = isMail ? 'mailto:' + contact + '?subject=' + encodeURIComponent('Re: proyek ' + oneLine(f.name)) : (wa ? 'https://wa.me/' + wa : '');
  // the reply page, filled in from here. In the #fragment, so the visitor's details never reach a server log.
  const composer = isMail
    ? base + '/balas/#' + new URLSearchParams({ to: contact, name: oneLine(f.name), service: oneLine(f.service), ref: f.summary.slice(0, 1500) }).toString()
    : '';
  const row = (k: string, v: string, last = false): string => {
    const b = last ? '0' : '1px solid ' + LINE;
    return '<tr><td style="padding:12px 0;border-bottom:' + b + ';width:118px;vertical-align:top;font:700 11px/1.5 ' + MONO + ';letter-spacing:1.5px;color:' + SOFT + ';">' + k + '</td>' +
      '<td style="padding:12px 0;border-bottom:' + b + ';vertical-align:top;font:400 15px/1.5 ' + MONO + ';color:' + INK + ';">' + v + '</td></tr>';
  };
  const contactCell = direct ? '<a href="' + esc(direct) + '" style="color:' + INK + ';text-decoration:underline;">' + esc(contact) + '</a>' : esc(contact);
  const service = esc(oneLine(f.service) || 'Belum tahu');
  const paper =
    topRow('UNTUK: _THRIVIT', 'FORM // ' + noLink('THRIVEIT.ID')) +
    '<h1 style="margin:28px 0 6px;font:700 24px/1.3 ' + MONO + ';color:' + INK + ';">Pesan proyek baru</h1>' +
    '<p style="margin:0 0 24px;font:400 14px/1.6 ' + MONO + ';color:' + SOFT + ';">Dikirim lewat form kontak pada ' + esc(when) + '.</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
      row('NAMA', esc(oneLine(f.name))) +
      row('USAHA', f.company ? esc(oneLine(f.company)) : '<span style="color:' + SOFT + ';">-</span>') +
      row('KONTAK', contactCell) +
      row('LAYANAN', service, true) +
    '</table>' +
    '<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>' + label('&gt; RINGKASAN PROYEK') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
      '<td style="background:#ffffff;border:1px solid ' + LINE + ';border-left:3px solid ' + INK + ';padding:18px 20px;font:400 15px/1.75 ' + MONO + ';color:' + INK + ';">' + para(f.summary) + '</td>' +
    '</tr></table>' +
    (composer ? button(composer, 'Balas dengan surat ThrivIT &rarr;') : (direct ? button(direct, 'Balas lewat WhatsApp &rarr;') : ''));
  const footer = 'Email ini dikirim otomatis dari form kontak <a href="' + base + '" style="color:#7a7a72;">thriveit.id</a>.' +
    (isMail ? '<br>Tombol di atas membuka halaman balasan yang sudah terisi. Tekan &ldquo;Balas&rdquo; di Gmail untuk email biasa.' : '');
  const pre = esc(oneLine(f.name)) + (f.company ? ' (' + esc(oneLine(f.company)) + ')' : '') + ' · ' + service + ' · ' + esc(contact);
  return shell('Pesan proyek baru', pre, paper, footer);
}

export function inquiryText(f: Inquiry, when: string): string {
  return ['PESAN PROYEK BARU · FORM THRIVEIT.ID', 'Dikirim ' + when, '',
    'Nama    : ' + oneLine(f.name), 'Usaha   : ' + (oneLine(f.company) || '-'), 'Kontak  : ' + oneLine(f.contact),
    'Layanan : ' + (oneLine(f.service) || 'Belum tahu'), '', 'Ringkasan proyek:', f.summary].join('\n');
}

/* ---------- 2. our reply to a prospective client ---------- */
export interface Reply { name: string; subject: string; message: string; ref: string; sender: string; replyTo: string }

export function replyHtml(r: Reply, base: string, when: string): string {
  const name = oneLine(r.name);
  const paper =
    topRow('DARI: _THRIVIT', 'UNTUK: ' + esc((name || 'ANDA').toUpperCase())) +
    '<p style="margin:24px 0 0;font:400 12px/1.6 ' + MONO + ';color:' + SOFT + ';">Bandung, ' + esc(when.replace(/ pukul.*$/, '')) + '</p>' +
    '<h1 style="margin:10px 0 24px;font:700 22px/1.35 ' + MONO + ';color:' + INK + ';">' + esc(oneLine(r.subject)) + '</h1>' +
    '<div style="font:400 15px/1.8 ' + MONO + ';color:' + INK + ';">' +
      (name ? '<p style="margin:0 0 16px;">Halo ' + esc(name) + ',</p>' : '') +
      r.message.trim().split(/\r?\n\s*\r?\n/).map((p) => '<p style="margin:0 0 16px;">' + para(p) + '</p>').join('') +
    '</div>' +
    // signature
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px;"><tr>' +
      '<td style="border-left:3px solid ' + AC + ';padding:2px 0 2px 14px;font:400 13px/1.7 ' + MONO + ';color:' + INK + ';">' +
        'Salam,<br><b>' + esc(oneLine(r.sender) || 'Tim ThrivIT') + '</b><br>' +
        '<span style="color:' + SOFT + ';">ThrivIT &middot; Studio digital untuk UMKM</span><br>' +
        '<a href="' + base + '" style="color:' + INK + ';">thriveit.id</a>' + (r.replyTo ? ' &middot; <a href="mailto:' + esc(r.replyTo) + '" style="color:' + INK + ';">' + esc(r.replyTo) + '</a>' : '') +
      '</td></tr></table>' +
    (r.ref.trim()
      ? '<div style="height:28px;line-height:28px;font-size:0;">&nbsp;</div>' + label('&gt; PESAN ANDA SEBELUMNYA') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="border-left:3px solid ' + LINE + ';padding:4px 0 4px 16px;font:400 13px/1.7 ' + MONO + ';color:' + SOFT + ';">' + para(r.ref) + '</td>' +
        '</tr></table>'
      : '');
  const footer = 'Balas email ini untuk melanjutkan percakapan dengan kami.<br>ThrivIT &middot; <a href="' + base + '" style="color:#7a7a72;">thriveit.id</a>';
  const pre = esc(r.message.trim().replace(/\s+/g, ' ').slice(0, 120));
  return shell(oneLine(r.subject), pre, paper, footer);
}

export function replyText(r: Reply, when: string): string {
  const name = oneLine(r.name);
  return [oneLine(r.subject), 'Bandung, ' + when.replace(/ pukul.*$/, ''), '', name ? 'Halo ' + name + ',' : '', '', r.message.trim(), '',
    'Salam,', oneLine(r.sender) || 'Tim ThrivIT', 'ThrivIT · Studio digital untuk UMKM', 'thriveit.id' + (r.replyTo ? ' · ' + r.replyTo : ''),
    ...(r.ref.trim() ? ['', '> Pesan Anda sebelumnya:', ...r.ref.trim().split(/\r?\n/).map((l) => '> ' + l)] : [])].join('\n');
}
