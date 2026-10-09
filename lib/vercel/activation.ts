import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { database, sqlClient, ensureSchema } from './database';
import { getAuth, ownerEmail } from './auth';
export function sameSecret(input: unknown, secret: string | undefined) {
  return typeof input === 'string' && !!secret && timingSafeEqual(createHash('sha256').update(input).digest(), createHash('sha256').update(secret).digest());
}
export function tokenHash(token: string) { return createHash('sha256').update(token).digest('hex'); }
export async function ownerExists() {
  await ensureSchema();
  return !!await database().prepare('SELECT id FROM auth_user WHERE email=?').bind(ownerEmail()).first();
}
export function checkOrigin(request: Request) {
  const trusted=process.env.BETTER_AUTH_URL || request.url;
  if (request.headers.get('origin') !== new URL(trusted).origin) throw new Error('invalid_origin');
}
export async function enrollmentRateLimit() {
  await ensureSchema();
  // Shared global cap avoids trusting attacker-supplied IP headers for activation.
  const minute=Math.floor(Date.now()/60000);
  await sqlClient().execute({sql:'DELETE FROM solar_enrollment_limits WHERE CAST(substr(key,12) AS INTEGER)<?',args:[minute-60]});
  const key = `enrollment-${minute}`;
  const r = await sqlClient().execute({ sql: 'INSERT INTO solar_enrollment_limits(key,count) VALUES(?,1) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count', args: [key] });
  if (Number(r.rows[0].count) > 5) throw new Error('rate_limited');
}
export async function activateOwner(body: { key?: unknown; email?: unknown; password?: unknown; name?: unknown }) {
  if (await ownerExists()) throw new Error('already_activated');
  if (!sameSecret(body.key, process.env.BETTER_AUTH_SECRET)) throw new Error('invalid_activation');
  if (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== ownerEmail()) throw new Error('invalid_activation');
  if (typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw new Error('invalid_password');
  await (await getAuth()).api.signUpEmail({ body: { email: ownerEmail(), password: body.password, name: typeof body.name === 'string' ? body.name.trim().slice(0,100) || 'Administrateur' : 'Administrateur' } });
  return { ok: true };
}
export async function createInvitation(owner: string, recordId: string) {
  const r = await database().prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='users' AND archived=0 AND json_extract(data,'$.status')='active'").bind(recordId, owner).first<{ data: string }>();
  if (!r) throw new Error('not_found');
  const email = String(JSON.parse(r.data).email).trim().toLowerCase();
  if (await database().prepare('SELECT id FROM auth_user WHERE email=?').bind(email).first()) throw new Error('account_exists');
  const token = randomBytes(32).toString('base64url');
  await database().batch([
    database().prepare('DELETE FROM solar_invitations WHERE owner=? AND record_id=? AND used=0').bind(owner,recordId),
    database().prepare('INSERT INTO solar_invitations(token_hash,owner,record_id,email,expires_at,used) VALUES(?,?,?,?,?,0)').bind(tokenHash(token),owner,recordId,email,Date.now()+7*24*60*60*1000),
  ]);
  return { token };
}
export async function acceptInvitation(body: { token?: unknown; password?: unknown; name?: unknown }) {
  if (typeof body.token !== 'string' || typeof body.password !== 'string' || body.password.length < 12 || body.password.length > 128) throw new Error('invalid_invitation');
  const hash = tokenHash(body.token);
  const invite = await database().prepare("SELECT i.email,r.data FROM solar_invitations i JOIN records r ON r.id=i.record_id AND r.owner=i.owner WHERE i.token_hash=? AND i.used=0 AND i.expires_at>? AND r.kind='users' AND r.archived=0 AND json_extract(r.data,'$.status')='active' AND lower(json_extract(r.data,'$.email'))=i.email").bind(hash,Date.now()).first<{ email:string; data:string }>();
  if (!invite) throw new Error('invalid_invitation');
  const claim = await database().prepare('UPDATE solar_invitations SET used=1 WHERE token_hash=? AND used=0 RETURNING email').bind(hash).first();
  if (!claim) throw new Error('invalid_invitation');
  try {
    await (await getAuth()).api.signUpEmail({ body: { email: invite.email, password: body.password, name: typeof body.name==='string'&&body.name.trim() ? body.name.trim().slice(0,100) : JSON.parse(invite.data).name || invite.email } });
  } catch (error) { await database().prepare('UPDATE solar_invitations SET used=0 WHERE token_hash=?').bind(hash).run(); throw error; }
  return { ok:true };
}
