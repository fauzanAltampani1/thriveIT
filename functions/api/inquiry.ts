// POST /api/inquiry — Cloudflare Pages Function. Takes the contact form as JSON and emails it to the company inbox
// through Resend (https://resend.com) as a ThrivIT letter (lib/letter.ts), plus a plain-text copy.
// Settings live in Cloudflare → project → Settings → Variables and Secrets:
//   RESEND_API_KEY  (secret)  the Resend API key
//   MAIL_TO                   where inquiries go, e.g. itthrived@gmail.com
//   MAIL_FROM       optional  sender; defaults to Resend's test sender, which can only mail the Resend account's own address
// Until RESEND_API_KEY and MAIL_TO are set it answers 503, and the page falls back to "send it yourself" (WhatsApp / email).
import { json, readJson, sendMail, str } from '../../lib/http';
import { EMAIL, inquiryHtml, inquiryText, nowWIB, oneLine, type Inquiry } from '../../lib/letter';

interface Env { RESEND_API_KEY?: string; MAIL_TO?: string; MAIL_FROM?: string }
interface Context { request: Request; env: Env }

const MAX: Record<keyof Inquiry, number> = { name: 120, company: 160, contact: 200, service: 80, summary: 4000 };

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!env.RESEND_API_KEY || !env.MAIL_TO) return json(503, { ok: false, error: 'not-configured' });
  const data = await readJson(request);
  if (data instanceof Response) return data;

  // bots: a hidden field people never see, or a form sent faster than anyone types. Pretend it worked.
  if (str(data, 'website') || Number(data.ms) < 1500) return json(200, { ok: true });

  const f = {} as Inquiry;
  for (const k of Object.keys(MAX) as (keyof Inquiry)[]) {
    f[k] = str(data, k);
    if (f[k].length > MAX[k]) return json(400, { ok: false, error: 'too-long', field: k });
  }
  const missing = (['name', 'contact', 'summary'] as const).filter((k) => !f[k]);
  if (missing.length) return json(400, { ok: false, error: 'missing', fields: missing });

  const base = new URL(request.url).origin, when = nowWIB(), contact = oneLine(f.contact);
  const mail: Record<string, unknown> = {
    from: env.MAIL_FROM || 'ThrivIT <onboarding@resend.dev>',
    to: env.MAIL_TO.split(',').map((s) => s.trim()).filter(Boolean),
    subject: 'Proyek baru dari ' + oneLine(f.name).slice(0, 60) + ' · ' + (oneLine(f.service) || 'Belum tahu'),
    html: inquiryHtml(f, base, when),
    text: inquiryText(f, when),
  };
  if (EMAIL.test(contact)) mail.reply_to = contact;   // "Reply" in Gmail goes straight to the visitor

  return (await sendMail(env.RESEND_API_KEY, mail)) ? json(200, { ok: true }) : json(502, { ok: false, error: 'mail-failed' });
};
