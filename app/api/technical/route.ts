import {access,assertRecord,assertOrigin,failure,db,visible} from '@/lib/solar/server';
import {renderTechnicalUnifilar} from '@/lib/solar/technical-unifilar';
import {renderStegDossier} from '@/lib/solar/steg-dossier';
import {record,all} from '@/lib/solar/business-server';
import * as technical from '@/lib/solar/technical-server';
import {technicalDXF,BT_TEMPLATE,MT_TEMPLATE,stegChecklist} from '@/lib/solar/technical-domain';
import {xmlEscape} from '@/lib/solar/fiscal';
export async function GET(request:Request){try{
 const ctx=await access(),url=new URL(request.url),e=await record(ctx,url.searchParams.get('id')??'');
 if(url.searchParams.get('format')==='dxf'){
  if(e.kind!=='technicalPlans')throw new Error('invalid_reference');return new Response(technicalDXF(e),{headers:{'Content-Type':'application/dxf','Content-Disposition':`attachment; filename="solar-plan-${e.id.replace(/[^a-zA-Z0-9-]/g,'')}.dxf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
 if(url.searchParams.get('format')==='unifilar'){if(e.kind!=='technicalPlans')throw new Error('invalid_reference');return new Response(renderTechnicalUnifilar(e),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",'X-Content-Type-Options':'nosniff'}});}
 if(url.searchParams.get('format')==='dossier'){
  if(e.kind!=='dossiers')throw new Error('invalid_reference');await record(ctx,e.data.projectId,'projects');await record(ctx,e.data.clientId,'clients');const records=(await all(ctx.owner)).filter(r=>visible(ctx,r));const project=records.find(r=>r.id===e.data.projectId)!;if(project.data.siteId)await record(ctx,project.data.siteId,'sites');const linkedIds=new Set([e.id,e.data.clientId,e.data.projectId,project.data.siteId,...records.filter(r=>r.data.projectId===project.id).map(r=>r.id),...records.filter(r=>r.kind==='technicalPlans'&&r.data.dossierId===e.id).flatMap(r=>[r.data.moduleProductId,r.data.inverterProductId])]);const files=(await db().prepare('SELECT id,record_id,filename FROM files WHERE owner=?').bind(ctx.owner).all<any>()).results.filter(f=>linkedIds.has(f.record_id)&&records.some(r=>r.id===f.record_id));const companyRow=await db().prepare('SELECT data FROM company WHERE owner=?').bind(ctx.owner).first<any>();const company=companyRow?JSON.parse(companyRow.data):{};const html=renderStegDossier(e,records,files,company);
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'",'X-Content-Type-Options':'nosniff'}});
 }
 throw new Error('invalid_format');
}catch(e){return failure(e);}}
export async function POST(request:Request){try{
 const ctx=await access();assertOrigin(request);const raw=await request.text();if(raw.length>64000)throw new Error('request_too_large');const b=JSON.parse(raw),action=b.action;
 const read=['createDossier','createPlan'].includes(action),e=await record(ctx,b.id,undefined,!read);
 if(!read&&e.revision!==b.revision)throw new Error('conflict');
 const result=action==='verifySteg'?await technical.verifyStegEvidence(ctx,e):action==='createDossier'?await technical.createStegDossier(ctx,e):action==='createPlan'?await technical.createPlan(ctx,e):action==='approveSteg'?await technical.approveSteg(ctx,e,b):action==='generateStudyPlan'?await technical.generateStudyPlan(ctx,e):action==='generatePlan'?await technical.generatePlan(ctx,e):action==='reviewPlan'?await technical.reviewPlan(ctx,e,b):action==='reservePlan'?await technical.reservePlan(ctx,e,b):action==='activateDrum'?await technical.activateDrum(ctx,e):action==='transferDrum'?await technical.transferDrum(ctx,e,b):action==='cutCable'?await technical.cutCable(ctx,e):action==='returnCable'?await technical.returnCable(ctx,e):null;
 if(!result)throw new Error('invalid_action');return Response.json(result);
}catch(e){return failure(e);}}
