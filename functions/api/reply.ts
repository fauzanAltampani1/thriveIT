// POST /api/reply — Cloudflare Pages Function behind the reply page (/balas/). Sends our answer to a prospective client
// as a ThrivIT letter (lib/letter.ts), or with { preview: true } only returns the letter's HTML so the page can show it.
// Needs, in Cloudflare → project → Settings → Variables and Secrets:
//   RESEND_API_KEY  (secret)  the Resend API key (shared with /api/inquiry)
//   REPLY_KEY       (secret)  the password typed on /balas/; at least 16 characters
//   REPLY_FROM                the sender, on a domain verified in Resend, e.g. ThrivIT <halo@thriveit.id>
//   MAIL_TO                   our inbox; gets a copy (bcc) of every reply, and is the reply-to unless REPLY_TO is set
//   REPLY_TO        optional  where the client's answers go, e.g. halo@thriveit.id
import { json, readJson, sameSecret, sendMail, str } from '../../lib/http';
import { EMAIL, nowWIB, oneLine, replyHtml, replyText, type Reply } from '../../lib/letter';

interface Env { RESEND_API_KEY?: string; REPLY_KEY?: string; REPLY_FROM?: string; MAIL_TO?: string; REPLY_TO?: string }
interface Context { request: Request; env: Env }

const MAX = { to: 200, name: 120, subject: 160, message: 8000, ref: 4000, sender: 80 } as const;

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  if (!env.REPLY_KEY || env.REPLY_KEY.length < 16) return json(503, { ok: false, error: 'not-configured', need: 'REPLY_KEY' });
  const data = await readJson(request);
  if (data instanceof Response) return data;
  if (!sameSecret(str(data, 'key'), env.REPLY_KEY)) {
    await new Promise((r) => setTimeout(r, 800));                      // slow down guessing
    return json(401, { ok: false, error: 'key' });
  }

  const v = {} as Record<keyof typeof MAX, string>;
  for (const k of Object.keys(MAX) as (keyof typeof MAX)[]) {
    v[k] = str(data, k);
    if (v[k].length > MAX[k]) return json(400, { ok: false, error: 'too-long', field: k });
  }
  const to = oneLine(v.to);
  if (!EMAIL.test(to)) return json(400, { ok: false, error: 'to' });
  if (!v.subject || !v.message) return json(400, { ok: false, error: 'missing' });

  const inbox = (env.MAIL_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  const replyTo = (env.REPLY_TO || inbox[0] || '').trim();
  const r: Reply = { name: v.name, subject: v.subject, message: v.message, ref: v.ref, sender: v.sender, replyTo };
  const base = new URL(request.url).origin, when = nowWIB();
  const html = replyHtml(r, base, when);
  if (data.preview === true) return json(200, { ok: true, html });

  if (!env.RESEND_API_KEY || !env.REPLY_FROM) return json(503, { ok: false, error: 'not-configured', need: 'RESEND_API_KEY, REPLY_FROM' });
  const mail: Record<string, unknown> = {
    from: env.REPLY_FROM,
    to: [to],
    subject: oneLine(v.subject),
    html,
    text: replyText(r, when),
  };
  if (replyTo) mail.reply_to = replyTo;
  if (inbox.length) mail.bcc = inbox;                                 // our own copy of what was sent
  return (await sendMail(env.RESEND_API_KEY, mail)) ? json(200, { ok: true }) : json(502, { ok: false, error: 'mail-failed' });
};
