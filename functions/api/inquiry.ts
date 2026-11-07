// POST /api/inquiry — Cloudflare Pages Function. Takes the contact form as JSON and emails it to the company inbox
// through Resend (https://resend.com). Settings live in Cloudflare → project → Settings → Variables and Secrets:
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

const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const oneLine = (s: string): string => s.replace(/[\r\n\t]+/g, ' ').trim();
const EMAIL = /^[^\s@<>()",;]+@[^\s@<>()",;]+\.[^\s@<>()",;]{2,}$/;

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

  const f = {} as Record<Field, string>;
  for (const k of Object.keys(MAX) as Field[]) {
    f[k] = get(k);
    if (f[k].length > MAX[k]) return json(400, { ok: false, error: 'too-long', field: k });
  }
  const missing = (['name', 'contact', 'summary'] as const).filter((k) => !f[k]);
  if (missing.length) return json(400, { ok: false, error: 'missing', fields: missing });

  const text = [
    'Pesan baru dari form thriveit.id',
    '',
    'Nama    : ' + oneLine(f.name),
    'Usaha   : ' + (oneLine(f.company) || '-'),
    'Kontak  : ' + oneLine(f.contact),
    'Layanan : ' + (oneLine(f.service) || '-'),
    '',
    f.summary,
  ].join('\n');

  const mail: Record<string, unknown> = {
    from: env.MAIL_FROM || 'ThrivIT <onboarding@resend.dev>',
    to: env.MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
    subject: 'Proyek baru: ' + oneLine(f.name).slice(0, 80),
    text,
  };
  if (EMAIL.test(f.contact)) mail.reply_to = f.contact;   // "Reply" in Gmail goes straight to the visitor

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
