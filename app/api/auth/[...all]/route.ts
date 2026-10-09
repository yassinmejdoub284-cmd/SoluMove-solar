import { getAuth } from '@/lib/vercel/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handle(request: Request) {
  const path = new URL(request.url).pathname;
  const allowed = new Set(['/api/auth/sign-in/email', '/api/auth/sign-out', '/api/auth/get-session', '/api/auth/ok']);
  if (!allowed.has(path)) return Response.json({ error: 'not_found' }, { status: 404 });
  try { return await (await getAuth()).handler(request); }
  catch { return Response.json({ error: 'auth_configuration_missing' }, { status: 503 }); }
}
export const GET = handle;
export const POST = handle;
