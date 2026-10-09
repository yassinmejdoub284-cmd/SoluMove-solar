import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './auth-schema';
import { sqlClient, ensureSchema } from './database';
export function ownerEmail() { return (process.env.SOLAR_OWNER_EMAIL || '').trim().toLowerCase(); }
let auth: ReturnType<typeof makeAuth> | undefined;
function makeAuth() {
  return betterAuth({

    appName: 'SoluMove Solar', secret: process.env.BETTER_AUTH_SECRET, baseURL: process.env.BETTER_AUTH_URL,
    database: drizzleAdapter(drizzle(sqlClient(), { schema }), { provider: 'sqlite', schema, transaction: true }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128, autoSignIn: false },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60,
      customRules: { '/sign-in/email': { window: 60, max: 5 } } },
    advanced: { ipAddress: { ipAddressHeaders: ['x-vercel-forwarded-for', 'x-forwarded-for'] } },
    // HTTP signup is blocked. Account creation only uses guarded server routes.
  });
}
export async function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32 || !ownerEmail()) throw new Error('auth_configuration_missing');
  await ensureSchema();
  if (!auth) auth=makeAuth();
  return auth;
}
