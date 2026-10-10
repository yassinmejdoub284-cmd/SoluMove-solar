// The bridge maintains the authorized portal/browser session. It never solves a CAPTCHA.
export type StegChallenge={status:'captcha_required';sessionId:string;expiresAt:string;challenge:{kind:'image'|'interactive';image?:string;url?:string;prompt:string}};
export function trustedGateway(raw:string|undefined,host:string|undefined){
 if(!raw||!host)throw new Error('steg_integration_required');const u=new URL(raw);
 if(u.protocol!=='https:'||u.hostname!==host||u.username||u.password||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||/localhost|\.local$|\.internal$/i.test(u.hostname))throw new Error('integration_configuration_required');return u;
}
export function providerResult(d:any,reference:string,host:string,now=Date.now()){
 if(!d||d.reference!==reference)throw new Error('invalid_provider_response');
 if(d.status==='captcha_required'){
  if(typeof d.sessionId!=='string'||!d.sessionId||d.sessionId.length>2000||!Number.isFinite(Date.parse(d.expiresAt))||Date.parse(d.expiresAt)<=now||Date.parse(d.expiresAt)>now+10*60000)throw new Error('invalid_provider_response');
  const c=d.challenge;if(!c||!['image','interactive'].includes(c.kind))throw new Error('invalid_provider_response');
  if(c.kind==='image'&&(typeof c.image!=='string'||c.image.length>700000||!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(c.image)))throw new Error('invalid_provider_response');
  if(c.kind==='interactive'){const url=trustedGateway(c.url,host);if(url.port&&url.port!=='443')throw new Error('invalid_provider_response');}
  return {status:'captcha_required' as const,sessionId:d.sessionId,expiresAt:d.expiresAt,challenge:{kind:c.kind as 'image'|'interactive',...(c.kind==='image'?{image:c.image}:{url:c.url}),prompt:String(c.prompt??'Résolvez le CAPTCHA pour poursuivre la vérification STEG.').slice(0,500)}};
 }
 if(d.complete!==true||!['paid','unpaid'].includes(d.status)||!Number.isSafeInteger(d.balanceMillimes)||d.balanceMillimes<0||d.status==='paid'&&d.balanceMillimes!==0||d.status==='unpaid'&&d.balanceMillimes<=0||!/^\d{4}-\d{2}-\d{2}T/.test(d.observedAt??'')||!Number.isFinite(Date.parse(d.observedAt))||Math.abs(now-Date.parse(d.observedAt))>86400000||typeof d.evidenceReference!=='string'||!d.evidenceReference||d.evidenceReference.length>200)throw new Error('invalid_provider_response');
 return {status:d.status as 'paid'|'unpaid',reference,complete:true,balanceMillimes:d.balanceMillimes,observedAt:d.observedAt,evidenceReference:d.evidenceReference};
}
const bytes=(s:string)=>new TextEncoder().encode(s);
const base64=(b:Uint8Array)=>btoa(Array.from(b,n=>String.fromCharCode(n)).join(''));
const unbase64=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function encryptionKey(secret:string){if(!secret||secret.length<32)throw new Error('steg_encryption_secret_required');const hash=await crypto.subtle.digest('SHA-256',bytes('solar-steg-v1:'+secret));return crypto.subtle.importKey('raw',hash,'AES-GCM',false,['encrypt','decrypt']);}
export async function sealCredential(value:unknown,secret:string,context:string){const iv=crypto.getRandomValues(new Uint8Array(12)),key=await encryptionKey(secret);const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes(context)},key,bytes(JSON.stringify(value)));return JSON.stringify({v:1,iv:base64(iv),cipher:base64(new Uint8Array(cipher))});}
export async function openCredential(value:string,secret:string,context:string){try{const d=JSON.parse(value);if(d.v!==1)throw new Error();const key=await encryptionKey(secret);const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(d.iv),additionalData:bytes(context)},key,unbase64(d.cipher));return JSON.parse(new TextDecoder().decode(plain));}catch{throw new Error('steg_credentials_unavailable');}}
