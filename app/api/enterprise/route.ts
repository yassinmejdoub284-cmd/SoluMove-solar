import {access,assertModule,assertRecord,assertOrigin,assertAdmin,db,failure,visible} from '@/lib/solar/server';
import * as core from '@/lib/solar/business-server';
import * as business from '@/lib/solar/enterprise-server';
import {tejXML,validateTej,tejCodes} from '@/lib/solar/fiscal';
import {teifDraft} from '@/lib/solar/teif';
export const runtime='nodejs';
export async function GET(request:Request){try{
 const ctx=await access(),url=new URL(request.url);
 if(url.searchParams.has('codes')){assertModule(ctx,'withholdings');return Response.json({codes:tejCodes});}
 if(url.searchParams.has('directory')){assertModule(ctx,'conversations');const users=(await core.all(ctx.owner)).filter(r=>r.kind==='users'&&r.data.status==='active');return Response.json({emails:[...new Set([ctx.email,...users.map(r=>r.data.email),process.env.SOLAR_OWNER_EMAIL].filter(Boolean))]},{headers:{'Cache-Control':'private, no-store'}});}
 if(url.searchParams.has('tej')){
  assertModule(ctx,'withholdings');const certificates=(await core.all(ctx.owner)).filter(r=>r.kind==='withholdings'&&r.data.direction==='issued'&&['validated','submitted'].includes(r.data.status)&&r.data.date.slice(0,7)===url.searchParams.get('period')&&(url.searchParams.get('act')==='1'?r.data.operation!=='add':r.data.operation==='add')&&visible(ctx,r)).filter((r,_,rows)=>r.data.operation!=='modify'||!rows.some(c=>c.data.reference===r.data.reference&&c.data.operation==='cancel'));
  if(!ctx.admin)throw new Error('forbidden');const co=await db().prepare('SELECT data FROM company WHERE owner=?').bind(ctx.owner).first<{data:string}>();
  const result=tejXML(co?JSON.parse(co.data):{},url.searchParams.get('period')??'',url.searchParams.get('act')??'0',certificates.map(r=>r.data));await validateTej(result.xml);
  return new Response(result.xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'private, no-store','X-Solar-Validation':'XSD-TEJ-2026-09; source-syntax-repair; authority-acceptance-pending'}});
 }
 if(url.searchParams.has('teif')){const invoice=await core.record(ctx,url.searchParams.get('teif')!,'invoices');assertModule(ctx,'eInvoices');const client=await core.record(ctx,invoice.data.clientId,'clients');const co=await db().prepare('SELECT data FROM company WHERE owner=?').bind(ctx.owner).first<{data:string}>();const result=teifDraft(invoice.data,co?JSON.parse(co.data):{},client.data,(await core.all(ctx.owner)).filter(r=>r.kind==='products'&&visible(ctx,r)));return new Response(result.xml,{headers:{'Content-Type':'application/xml; charset=utf-8','Content-Disposition':`attachment; filename="${result.filename}"`,'Cache-Control':'private, no-store','X-Solar-Validation':'TEIF-DRAFT; XSD-1.1-qualification-required'}});}
 throw new Error('invalid_action');
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const ctx=await access();assertOrigin(request);const raw=await request.text();if(raw.length>100000)throw new Error('request_too_large');const b=JSON.parse(raw);
 if(b.action==='handKeys')return Response.json(await business.handKeys(ctx,b));
 if(b.action==='createConversation')return Response.json(await business.createConversation(ctx,b));
 if(b.action==='sendMessage')return Response.json(await business.sendMessage(ctx,b));
 if(b.action==='notify')return Response.json(await business.notify(ctx,b));
 const e=await core.record(ctx,b.id,undefined,['acknowledge','createEInvoice'].includes(b.action)?false:true);if(b.revision!==e.revision)throw new Error('conflict');
 if(b.action==='acknowledge')return Response.json(await business.acknowledge(ctx,e));
 if(b.action==='postExit')return Response.json(await business.postExit(ctx,e));
 if(b.action==='transferClient')return Response.json(await business.transferClient(ctx,e));
 if(b.action==='returnKeys')return Response.json(await business.returnKeys(ctx,e,b));
 if(b.action==='completeMaintenance')return Response.json(await business.completeMaintenance(ctx,e));
 if(b.action==='issueWithholding')return Response.json(await business.issueWithholding(ctx,e));
 if(b.action==='validateVatReturn')return Response.json(await business.validateVatReturn(ctx,e));
 if(b.action==='applyCredit')return Response.json(await business.applyCredit(ctx,e));
 if(b.action==='createEInvoice'){
  if(e.kind!=='invoices'||e.data.status!=='issued')throw new Error('invalid_invoice');assertModule(ctx,'eInvoices','add');const id=e.id+'-teif',existing=(await core.all(ctx.owner)).find(r=>r.id===id);if(existing)return Response.json({id});const co=await db().prepare('SELECT data FROM company WHERE owner=?').bind(ctx.owner).first<{data:string}>();const client=await core.record(ctx,e.data.clientId,'clients');teifDraft(e.data,co?JSON.parse(co.data):{},client.data);const dossier={name:'El Fatoora · '+e.data.name,invoiceId:e.id,agencyId:e.data.agencyId,schemaVersion:'1.8.9 archive',status:'draft',qualificationRequired:true};assertRecord(ctx,{id,kind:'eInvoices',data:dossier},'add');await core.insert(ctx,'eInvoices',dossier,id).run();return Response.json({id});
 }
 if(b.action==='fiscalSubmission'){
  if(!['withholdings','vatReturns'].includes(e.kind)||e.data.status!=='validated')throw new Error('invalid_status');if(e.kind==='vatReturns')assertAdmin(ctx);
  const file=await db().prepare('SELECT id FROM files WHERE owner=? AND record_id=? AND id=?').bind(ctx.owner,e.id,b.fileId).first();if(!file||!String(b.reference??'').trim())throw new Error('evidence_required');
  await db().batch([core.guard(ctx,e),core.update(ctx,e,{...e.data,status:'submitted',submissionReference:String(b.reference).slice(0,200),submissionFileId:b.fileId,submittedAt:new Date().toISOString(),submittedBy:ctx.actor,verificationMethod:'external_evidence_recorded'})]);return Response.json({ok:true});
 }
 if(b.action==='eInvoiceEvidence'){
  assertAdmin(ctx);if(e.kind!=='eInvoices'||!['prepared','signed','submitted','accepted','rejected'].includes(b.status))throw new Error('invalid_status');
  const transitions:Record<string,string[]>={draft:['prepared'],prepared:['signed'],signed:['submitted'],submitted:['accepted','rejected'],rejected:['prepared']};if(!transitions[e.data.status]?.includes(b.status))throw new Error('invalid_status');
  const file=await db().prepare('SELECT id FROM files WHERE owner=? AND record_id=? AND id=?').bind(ctx.owner,e.id,b.fileId).first();if(!file||!String(b.reference??'').trim())throw new Error('evidence_required');
  await db().batch([core.guard(ctx,e),core.update(ctx,e,{...e.data,status:b.status,providerReference:String(b.reference).slice(0,200),evidence:[...(e.data.evidence??[]),{status:b.status,fileId:b.fileId,reference:b.reference,actor:ctx.actor,date:new Date().toISOString()}],verificationMethod:'external_evidence_recorded'})]);return Response.json({ok:true});
 }
 throw new Error('invalid_action');
}catch(e){return failure(e);}}
