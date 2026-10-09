import { checkOrigin, enrollmentRateLimit, activateOwner, acceptInvitation } from '@/lib/vercel/activation';
export const runtime='nodejs';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const raw = await request.text();
    if (raw.length>4000) throw new Error('request_too_large');
    await enrollmentRateLimit();
    const body = JSON.parse(raw);
    return Response.json(body.action === 'invite' ? await acceptInvitation(body) : await activateOwner(body), { headers: { 'Cache-Control':'no-store' } });
  } catch (e) {
    const error = e instanceof Error ? e.message : 'activation_failed';
    const safe = ['rate_limited','already_activated','invalid_activation','invalid_invitation','invalid_password','invalid_origin'];
    return Response.json({ error: safe.includes(error) ? error : 'activation_failed' }, { status: error==='rate_limited'?429:400 });
  }
}
