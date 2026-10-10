import {env} from 'cloudflare:workers';
import {db,assertRecord,assertModule,type Access} from './server';
import {record,all,insert,guard,update} from './business-server';
import {attachment} from './technical-server';
import {tunisToday} from './enterprise-domain';
import {trustedGateway,providerResult,sealCredential,openCredential} from './steg-connector-domain';
const config=()=>env as any;
const setting=(key:string)=>config()[key]??process.env[key];
const secret=()=>setting('STEG_CONNECTOR_SECRET')??setting('BETTER_AUTH_SECRET');
export async function saveConnector(ctx:Access,b:any){
 const previous=b.id?await record(ctx,b.id,'stegConnectors',true):undefined;
 if(previous&&previous.revision!==b.revision)throw new Error('conflict');assertModule(ctx,'stegConnectors',previous?'edit':'add');
 const site=await record(ctx,b.siteId,'sites'),client=await record(ctx,b.clientId,'clients');if(site.data.clientId!==client.id)throw new Error('client_site_mismatch');
 const id=previous?.id??crypto.randomUUID(),login=String(b.login??'').trim(),password=String(b.password??'');
 if(!login||login.length>200||password.length>500||(!previous&&!password))throw new Error('steg_credentials_required');
 let credentials={login,password};if(previous&&!password){const old=await db().prepare('SELECT ciphertext FROM solar_connector_secrets WHERE owner=? AND connector_id=?').bind(ctx.owner,id).first<any>();if(!old)throw new Error('steg_credentials_unavailable');const saved=await openCredential(old.ciphertext,secret(),ctx.owner+':'+id);if(saved.login!==login)throw new Error('steg_credentials_required');credentials=saved;}
 const data={name:String(b.name??'Connecteur STEG').trim().slice(0,150),clientId:client.id,siteId:site.id,agencyId:site.data.agencyId??client.data.agencyId,status:b.status==='inactive'?'inactive':'active',loginHint:login.slice(0,2)+'••••',credentialsConfigured:true,configuredAt:new Date().toISOString()};assertRecord(ctx,{id,kind:'stegConnectors',data},previous?'edit':'add');
 const cipher=await sealCredential(credentials,secret(),ctx.owner+':'+id),batch=previous?[guard(ctx,previous),update(ctx,previous,data)]:[insert(ctx,'stegConnectors',data,id)];
 batch.push(db().prepare('INSERT INTO solar_connector_secrets(owner,connector_id,ciphertext,updated_at) VALUES(?,?,?,?) ON CONFLICT(owner,connector_id) DO UPDATE SET ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').bind(ctx.owner,id,cipher,new Date().toISOString()));
 // Re-enrolment invalidates pending sessions. Secrets never enter records/audit/backup snapshots.
 batch.push(db().prepare('DELETE FROM solar_connector_sessions WHERE owner=? AND connector_id=?').bind(ctx.owner,id));await db().batch(batch);return {id};
}
async function gateway(payload:any){const u=trustedGateway(setting('STEG_GATEWAY_URL'),setting('STEG_GATEWAY_HOST')),token=setting('STEG_GATEWAY_TOKEN');if(!token)throw new Error('steg_integration_required');let response:Response;
 try{response=await fetch(u,{method:'POST',redirect:'manual',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(payload)});}catch{throw new Error('integration_unavailable');}
 if(!response.ok||Number(response.headers.get('content-length')??0)>800000)throw new Error('integration_unavailable');const reader=response.body?.getReader();if(!reader)throw new Error('invalid_provider_response');let size=0;const chunks:Uint8Array[]=[];for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>800000){await reader.cancel();throw new Error('invalid_provider_response');}chunks.push(value);}const combined=new Uint8Array(size);let offset=0;for(const chunk of chunks){combined.set(chunk,offset);offset+=chunk.length;}let d;try{d=JSON.parse(new TextDecoder().decode(combined));}catch{throw new Error('invalid_provider_response');}return providerResult(d,payload.reference,u.hostname);
}
export async function checkConnector(ctx:Access,b:any){
 assertModule(ctx,'stegChecks','add');const project=await record(ctx,b.projectId,'projects'),site=await record(ctx,project.data.siteId,'sites'),client=await record(ctx,project.data.clientId,'clients');if(site.data.clientId!==client.id)throw new Error('client_site_mismatch');
 if(!/^\d{9}$/.test(site.data.stegRef??''))throw new Error('steg_reference_mismatch');if(!site.data.stegConsentUntil||site.data.stegConsentUntil<tunisToday())throw new Error('steg_consent_required');await attachment(ctx,site.data.stegConsentFileId,[site.id,client.id]);
 const connectors=(await all(ctx.owner)).filter(e=>e.kind==='stegConnectors'&&e.data.siteId===site.id&&e.data.clientId===client.id&&e.data.status==='active');if(connectors.length!==1)throw new Error('steg_connector_required');const connector=connectors[0];assertRecord(ctx,connector);
 // Check configuration before opening any saved secret.
 trustedGateway(setting('STEG_GATEWAY_URL'),setting('STEG_GATEWAY_HOST'));
 let session:any,sessionState:any;
 if(b.action==='resume'){
  session=await db().prepare('SELECT * FROM solar_connector_sessions WHERE id=? AND owner=? AND actor=? AND project_id=? AND connector_id=?').bind(b.sessionId,ctx.owner,ctx.actor,project.id,connector.id).first<any>();
  if(!session||session.expires_at<=new Date().toISOString())throw new Error('steg_captcha_expired');sessionState=await openCredential(session.ciphertext,secret(),ctx.owner+':session:'+session.id);
  if(sessionState.siteRevision!==site.revision||sessionState.connectorRevision!==connector.revision||sessionState.reference!==site.data.stegRef)throw new Error('conflict');
  if(typeof b.answer!=='string'||b.answer.length>500)throw new Error('invalid_captcha_answer');
 }
 let payload:any={action:session?'resumeAccountStatus':'accountStatus',reference:site.data.stegRef,consentId:site.data.stegConsentFileId};
 if(session){payload.sessionId=sessionState.providerSessionId;payload.captchaAnswer=b.answer;}
 else {const vault=await db().prepare('SELECT ciphertext FROM solar_connector_secrets WHERE owner=? AND connector_id=?').bind(ctx.owner,connector.id).first<any>();if(!vault)throw new Error('steg_credentials_unavailable');payload.credentials=await openCredential(vault.ciphertext,secret(),ctx.owner+':'+connector.id);}
 // Atomic one-use claim before external resume: another request cannot reuse the challenge.
 if(session){const claim=await db().prepare('DELETE FROM solar_connector_sessions WHERE id=? AND owner=? AND revision=?').bind(session.id,ctx.owner,session.revision).run();if(claim.meta.changes!==1)throw new Error('conflict');}
 const result=await gateway(payload);
 if(result.status==='captcha_required'){
  const id=crypto.randomUUID(),cipher=await sealCredential({providerSessionId:result.sessionId,reference:site.data.stegRef,siteRevision:site.revision,connectorRevision:connector.revision},secret(),ctx.owner+':session:'+id);
  await db().batch([db().prepare('DELETE FROM solar_connector_sessions WHERE expires_at<? OR (owner=? AND actor=? AND project_id=?)').bind(new Date().toISOString(),ctx.owner,ctx.actor,project.id),guard(ctx,site),guard(ctx,connector),db().prepare('INSERT INTO solar_connector_sessions(id,owner,actor,project_id,connector_id,ciphertext,expires_at) VALUES(?,?,?,?,?,?,?)').bind(id,ctx.owner,ctx.actor,project.id,connector.id,cipher,result.expiresAt)]);
  return {status:'captcha_required',sessionId:id,expiresAt:result.expiresAt,challenge:result.challenge};
 }
 const id=crypto.randomUUID(),data={name:'Vérification STEG · '+project.data.name,clientId:client.id,projectId:project.id,siteId:site.id,agencyId:project.data.agencyId,reference:result.reference,date:tunisToday(),result:result.status,balance:result.balanceMillimes,validUntil:new Date(Date.now()+7*86400000).toISOString().slice(0,10),status:'verified',source:'authorizedConnector',connectorId:connector.id,evidenceReference:result.evidenceReference,observedAt:result.observedAt,verifiedAt:new Date().toISOString(),verifiedBy:ctx.actor,siteRevision:site.revision};assertRecord(ctx,{id,kind:'stegChecks',data},'add');
 await db().batch([guard(ctx,project),guard(ctx,site),guard(ctx,connector),insert(ctx,'stegChecks',data,id)]);return {status:'verified',id};
}
