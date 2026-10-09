import SignInForm from './sign-in-form';
import { ownerExists } from '@/lib/vercel/activation';
import { getAuth } from '@/lib/vercel/auth';
export const dynamic='force-dynamic';
export default async function SignInPage(){
  try { await getAuth(); return <SignInForm setup={!await ownerExists()}/>; }
  catch { return <main className="auth-page"><section className="auth-card"><h1>SoluMove Solar</h1><h2>Configuration à vérifier</h2><p>La connexion à la base ou la configuration de connexion est indisponible.</p><p>Dans Vercel, vérifiez TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BETTER_AUTH_SECRET (32 caractères minimum), BETTER_AUTH_URL et SOLAR_OWNER_EMAIL, puis redéployez.</p></section></main>; }
}
