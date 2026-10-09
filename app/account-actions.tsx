'use client';
import {useState} from 'react';
import {createAuthClient} from 'better-auth/react';
import {Button} from '@/components/ui/button';
import {clearSnapshot} from '@/lib/solar/client';
const authClient=createAuthClient();
export function SignOut({actor,label}:{actor:string;label:string}){
 const [busy,setBusy]=useState(false);
 return <Button variant="ghost" disabled={busy} onClick={async()=>{setBusy(true);try{await clearSnapshot(actor);const r=await authClient.signOut();if(r.error)throw new Error('signout_failed');window.location.assign('/sign-in')}catch{setBusy(false)}}}>{label}</Button>;
}
export function InviteAccount({recordId}:{recordId:string}){
 const [url,setUrl]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 return <div className="invitation"><Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const r=await fetch('/api/invitations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({recordId})});const body:any=await r.json();if(!r.ok)throw new Error(body.error);setUrl(body.url)}catch(e){setError(e instanceof Error&&e.message==='account_exists'?'Le compte existe déjà. Le salarié peut se connecter.':'Impossible de créer l’invitation. Vérifiez la fiche active.')}finally{setBusy(false)}}}>Créer un lien d’activation</Button>{url&&<label>Lien privé valable 7 jours, à transmettre au salarié<input readOnly value={url} onFocus={e=>e.currentTarget.select()}/></label>}{error&&<p role="alert">{error}</p>}</div>;
}
