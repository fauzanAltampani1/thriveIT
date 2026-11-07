// Small helpers shared by the Pages Functions in functions/api.

export const json = (status: number, body: Record<string, unknown>): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/** a JSON POST from this site's own pages, parsed; otherwise the Response to send back */
export async function readJson(request: Request): Promise<Record<string, unknown> | Response> {
  const origin = request.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'origin' }); }
    catch { return json(403, { ok: false, error: 'origin' }); }
  }
  if (!(request.headers.get('content-type') || '').includes('application/json')) return json(415, { ok: false, error: 'type' });
  try { return await request.json() as Record<string, unknown>; } catch { return json(400, { ok: false, error: 'json' }); }
}

export const str = (data: Record<string, unknown>, k: string): string => (typeof data[k] === 'string' ? (data[k] as string).trim() : '');

/** send one email through Resend; true when Resend accepted it */
export async function sendMail(apiKey: string, mail: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + apiKey, 'content-type': 'application/json' },
      body: JSON.stringify(mail),
    });
    if (!res.ok) console.log('resend', res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.log('resend unreachable', String(e));
    return false;
  }
}

/** compare two secrets without leaking, through timing, how much of them matched */
export function sameSecret(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}
