// POST /api/inquiry — Cloudflare Pages Function. Takes the contact form as JSON and emails it to the company inbox
// through Resend (https://resend.com), as a formal "letter" that matches the paper on the site (plus a plain-text copy).
// Settings live in Cloudflare → project → Settings → Variables and Secrets:
//   RESEND_API_KEY  (secret)  the Resend API key
//   MAIL_TO                   where inquiries go, e.g. itthrived@gmail.com
//   MAIL_FROM       optional  sender; defaults to Resend's test sender, which can only mail the Resend account's own address
// Until RESEND_API_KEY and MAIL_TO are set it answers 503, and the page falls back to "send it yourself" (WhatsApp / email).

interface Env {
  RESEND_API_KEY?: string;
  MAIL_TO?: string;
  MAIL_FROM?: string;
}
interface Context { request: Request; env: Env }

const MAX = { name: 120, company: 160, contact: 200, service: 80, summary: 4000 } as const;
type Field = keyof typeof MAX;
type Form = Record<Field, string>;

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const oneLine = (s: string): string => s.replace(/[\r\n\t]+/g, ' ').trim();
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;
const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// an Indonesian phone number written any common way → 62xxxxxxxxxx for wa.me, or '' if it does not look like one
function waNumber(s: string): string {
  const d = s.replace(/[^\d+]/g, '');
  if (/^\+?62\d{8,13}$/.test(d)) return d.replace('+', '');
  if (/^0\d{8,13}$/.test(d)) return '62' + d.slice(1);
  return '';
}

function sentAt(): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' }).format(new Date()) + ' WIB';
  } catch {
    return new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  }
}

/* ---------- the letter: table layout + inline styles, which is what Gmail, Outlook and Apple Mail all render ---------- */
const INK = '#04292d', PAPER = '#e9f6f7', SOFT = '#3e6266', LINE = '#c5dfe2', AC = '#0ECEE1';
const MONO = "'Space Mono','SFMono-Regular',Menlo,Consolas,'Courier New',monospace";

function letterHtml(f: Form, base: string, when: string): string {
  const name = esc(oneLine(f.name)), contact = oneLine(f.contact);
  const isMail = EMAIL.test(contact), wa = isMail ? '' : waNumber(contact);
  const reply = isMail ? 'mailto:' + contact + '?subject=' + encodeURIComponent('Re: proyek ' + oneLine(f.name))
    : (wa ? 'https://wa.me/' + wa : '');
  const replyLabel = isMail ? 'Balas lewat email &rarr;' : 'Balas lewat WhatsApp &rarr;';
  const contactCell = reply
    ? '<a href="' + esc(reply) + '" style="color:' + INK + ';text-decoration:underline;">' + esc(contact) + '</a>'
    : esc(contact);
  const row = (label: string, value: string, last = false): string =>
    '<tr><td style="padding:12px 0;border-bottom:' + (last ? '0' : '1px solid ' + LINE) + ';width:118px;vertical-align:top;font:700 11px/1.5 ' + MONO + ';letter-spacing:1.5px;color:' + SOFT + ';">' + label + '</td>' +
    '<td style="padding:12px 0;border-bottom:' + (last ? '0' : '1px solid ' + LINE) + ';vertical-align:top;font:400 15px/1.5 ' + MONO + ';color:' + INK + ';">' + value + '</td></tr>';
  const summary = esc(f.summary).replace(/\r?\n/g, '<br>');
  const pre = name + (f.company ? ' (' + esc(oneLine(f.company)) + ')' : '') + ' · ' + esc(oneLine(f.service) || 'Belum tahu') + ' · ' + esc(contact);

  return '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Pesan proyek baru</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet"></head>' +
    '<body style="margin:0;padding:0;background:#efeee9;">' +
    // inbox preview line
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' + pre + '</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#efeee9;"><tr><td align="center" style="padding:32px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">' +
      // accent rule + black masthead with the wordmark
      '<tr><td style="height:4px;line-height:4px;font-size:0;background:' + AC + ';">&nbsp;</td></tr>' +
      '<tr><td align="center" style="background:#000000;padding:22px 24px;">' +
        '<img src="' + base + '/mail/logo.png" width="101" height="28" alt="_thrivit" style="display:block;border:0;width:101px;height:28px;">' +
      '</td></tr>' +
      // the airmail edge of the envelope
      '<tr><td style="background:#000000;line-height:0;font-size:0;"><img src="' + base + '/mail/stripe.png" width="600" height="8" alt="" style="display:block;border:0;width:100%;height:8px;"></td></tr>' +
      // the letter
      '<tr><td style="background:' + PAPER + ';padding:36px 40px 32px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
          '<tr><td style="padding-bottom:12px;border-bottom:2px solid ' + INK + ';font:700 11px/1.4 ' + MONO + ';letter-spacing:1.5px;color:' + INK + ';">UNTUK: _THRIVIT</td>' +
          '<td align="right" style="padding-bottom:12px;border-bottom:2px solid ' + INK + ';font:700 11px/1.4 ' + MONO + ';letter-spacing:1.5px;color:' + SOFT + ';">FORM // THRIVEIT.ID</td></tr>' +
        '</table>' +
        '<h1 style="margin:28px 0 6px;font:700 24px/1.3 ' + MONO + ';color:' + INK + ';">Pesan proyek baru</h1>' +
        '<p style="margin:0 0 24px;font:400 14px/1.6 ' + MONO + ';color:' + SOFT + ';">Dikirim lewat form kontak pada ' + esc(when) + '.</p>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
          row('NAMA', name) +
          row('USAHA', f.company ? esc(oneLine(f.company)) : '<span style="color:' + SOFT + ';">-</span>') +
          row('KONTAK', contactCell) +
          row('LAYANAN', esc(oneLine(f.service) || 'Belum tahu'), true) +
        '</table>' +
        '<p style="margin:28px 0 10px;font:700 11px/1.5 ' + MONO + ';letter-spacing:1.5px;color:' + SOFT + ';">&gt; RINGKASAN PROYEK</p>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
          '<td style="background:#ffffff;border:1px solid ' + LINE + ';border-left:3px solid ' + INK + ';padding:18px 20px;font:400 15px/1.75 ' + MONO + ';color:' + INK + ';">' + summary + '</td>' +
        '</tr></table>' +
        (reply
          ? '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;"><tr>' +
            '<td style="background:' + INK + ';"><a href="' + esc(reply) + '" style="display:inline-block;padding:14px 22px;font:700 13px/1 ' + MONO + ';letter-spacing:1px;text-transform:uppercase;color:' + PAPER + ';text-decoration:none;">' + replyLabel + '</a></td>' +
            '</tr></table>'
          : '') +
      '</td></tr>' +
      '<tr><td style="background:#000000;line-height:0;font-size:0;"><img src="' + base + '/mail/stripe.png" width="600" height="8" alt="" style="display:block;border:0;width:100%;height:8px;"></td></tr>' +
      // footer
      '<tr><td style="padding:20px 8px 0;font:400 11px/1.7 ' + MONO + ';color:#7a7a72;text-align:center;">' +
        'Email ini dikirim otomatis dari form kontak <a href="' + base + '" style="color:#7a7a72;">thriveit.id</a>.' +
        (isMail ? '<br>Tekan &ldquo;Balas&rdquo; untuk menjawab langsung ke ' + esc(contact) + '.' : '') +
      '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function letterText(f: Form, when: string): string {
  return [
    'PESAN PROYEK BARU · FORM THRIVEIT.ID',
    'Dikirim ' + when,
    '',
    'Nama    : ' + oneLine(f.name),
    'Usaha   : ' + (oneLine(f.company) || '-'),
    'Kontak  : ' + oneLine(f.contact),
    'Layanan : ' + (oneLine(f.service) || 'Belum tahu'),
    '',
    'Ringkasan proyek:',
    f.summary,
  ].join('\n');
}

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json(503, { ok: false, error: 'not-configured' });

  // only the site's own pages may post here
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'origin' }); }
    catch { return json(403, { ok: false, error: 'origin' }); }
  }
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'type' });

  let data: Record<string, unknown>;
  try { data = await request.json() as Record<string, unknown>; } catch { return json(400, { ok: false, error: 'json' }); }
  const get = (k: string): string => (typeof data[k] === 'string' ? (data[k] as string).trim() : '');

  // bots: a hidden field people never see, or a form sent faster than anyone types. Pretend it worked.
  if (get('website') || Number(data.ms) < 1500) return json(200, { ok: true });

  const f = {} as Form;
  for (const k of Object.keys(MAX) as Field[]) {
    f[k] = get(k);
    if (f[k].length > MAX[k]) return json(400, { ok: false, error: 'too-long', field: k });
  }
  const missing = (['name', 'contact', 'summary'] as const).filter((k) => !f[k]);
  if (missing.length) return json(400, { ok: false, error: 'missing', fields: missing });

  const base = new URL(request.url).origin, when = sentAt();
  const mail: Record<string, unknown> = {
    from: env.MAIL_FROM || 'ThrivIT <onboarding@resend.dev>',
    to: env.MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
    subject: 'Proyek baru dari ' + oneLine(f.name).slice(0, 60) + ' · ' + (oneLine(f.service) || 'Belum tahu'),
    html: letterHtml(f, base, when),
    text: letterText(f, when),
  };
  if (EMAIL.test(oneLine(f.contact))) mail.reply_to = oneLine(f.contact);   // "Reply" in Gmail goes straight to the visitor

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(mail),
    });
  } catch {
    return json(502, { ok: false, error: 'mail-unreachable' });
  }
  if (!res.ok) {
    console.log('resend', res.status, (await res.text()).slice(0, 300));
    return json(502, { ok: false, error: 'mail-failed' });
  }
  return json(200, { ok: true });
};
