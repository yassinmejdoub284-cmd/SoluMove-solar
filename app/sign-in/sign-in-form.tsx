'use client';
import { useEffect, useState } from 'react';
import { createAuthClient } from 'better-auth/react';
const authClient=createAuthClient();
export default function SignInForm({setup}:{setup:boolean}) {
  const [email,setEmail]=useState(''),[name,setName]=useState(''),[password,setPassword]=useState(''),[key,setKey]=useState(''),[invite,setInvite]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{const token=new URLSearchParams(window.location.hash.slice(1)).get('invite');if(token){setInvite(token);history.replaceState(null,'',window.location.pathname+window.location.search)}},[]);
  const activation=setup||!!invite;
  async function submit(event:React.FormEvent){
    event.preventDefault();setBusy(true);setError('');
    try{
      if(activation){const r=await fetch('/api/activation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(invite?{action:'invite',token:invite,password,name}:{action:'owner',key,email,password,name})});const body:any=await r.json();if(!r.ok)throw new Error(body.error);setKey('');
        if(invite){setInvite('');setPassword('');window.location.assign('/sign-in');return;}}
      const result=await authClient.signIn.email({email,password});
      if(result.error)throw new Error('login_failed');
      setPassword('');const returnTo=new URLSearchParams(window.location.search).get('return_to')||'/';
      const target=new URL(returnTo,window.location.origin);window.location.assign(target.origin===window.location.origin&&target.pathname!='/sign-in'?target.pathname+target.search:'/');
    }catch(e){const code=e instanceof Error?e.message:'';setError(({invalid_activation:'La clé d’activation ou l’adresse du propriétaire est incorrecte.',already_activated:'L’espace est déjà activé. Revenez à la connexion.',invalid_invitation:'Cette invitation a expiré ou a déjà été utilisée.',invalid_password:'Choisissez un mot de passe de 12 à 128 caractères.',rate_limited:'Trop de tentatives. Réessayez dans une minute.'} as Record<string,string>)[code]||'Connexion impossible. Vérifiez vos identifiants et réessayez.');}
    finally{setBusy(false)}
  }
  return <main className="auth-page"><section className="auth-card"><div className="auth-logo">☀</div><h1>SoluMove Solar</h1><p>{invite?'Activer votre compte salarié':setup?'Activer votre espace de gestion':'Connectez-vous à votre espace'}</p><form onSubmit={submit}>
    {activation&&<label>Votre nom<input autoComplete="name" value={name} onChange={e=>setName(e.target.value)} maxLength={100}/></label>}
    {!invite&&<label>Adresse e-mail<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label>}
    {setup&&!invite&&<><label>Clé d’activation<input type="password" autoComplete="off" required value={key} onChange={e=>setKey(e.target.value)}/></label><p className="auth-note">Pour la première activation, utilisez la valeur BETTER_AUTH_SECRET configurée dans votre projet Vercel. L’adresse doit correspondre à SOLAR_OWNER_EMAIL.</p></>}
    <label>{activation?'Choisissez votre mot de passe':'Mot de passe'}<input type="password" autoComplete={activation?'new-password':'current-password'} required minLength={activation?12:undefined} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>
    {error&&<p role="alert" className="auth-error">{error}</p>}<button disabled={busy} type="submit">{busy?'Patientez…':activation?'Activer mon compte':'Se connecter'}</button>
  </form><p className="auth-note">{activation?'Le mot de passe doit contenir au moins 12 caractères.':'Les comptes salariés sont ouverts sur invitation du propriétaire.'}</p></section></main>;
}
