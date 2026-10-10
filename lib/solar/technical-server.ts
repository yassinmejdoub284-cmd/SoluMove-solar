import {db,assertRecord,assertModule,type Access} from './server';
import {record,all,insert,guard,update,movement} from './business-server';
import {validate,isLocked,type Entry} from './domain';
import {technicalDesign,stegNetwork,stegChecklist} from './technical-domain';
import {supplierSettlement} from './supplier-settlement';
import {checkTaxpayer} from './fiscal';
import {dossierReadiness} from './steg-dossier';
import {legalChecklist,STEG_LEGAL_REFERENCES} from './steg-regulatory';
import {retentionAmounts,tunisToday} from './enterprise-domain';

export async function attachment(ctx:Access,id:string,parents:string[]){
 const file=await db().prepare('SELECT id,record_id,filename FROM files WHERE id=? AND owner=?').bind(id,ctx.owner).first<any>();
 if(!file||!parents.includes(file.record_id))throw new Error('technical_evidence_required');
 await record(ctx,file.record_id);return file;
}
async function projectSite(ctx:Access,project:Entry){
 const client=await record(ctx,project.data.clientId,'clients');if(!project.data.siteId)throw new Error('site_required');
 const site=await record(ctx,project.data.siteId,'sites');if(site.data.clientId!==client.id)throw new Error('client_site_mismatch');return {client,site};
}
export async function validateTechnicalSave(ctx:Access,kind:string,d:any,id?:string){
 if(kind==='studies'&&d.p90!==undefined&&(d.p50===undefined||d.p90>d.p50||!d.uncertaintyNotes))throw new Error('simulation_uncertainty_required');
 if(kind==='studies'&&d.shadingFileId)await attachment(ctx,d.shadingFileId,[id??'',d.projectId]);
 if(kind==='studies'&&d.simulationMonthly?.length){if(d.simulationMonthly.length!==12||new Set(d.simulationMonthly.map((m:any)=>m.month)).size!==12||d.simulationMonthly.some((m:any)=>!Number.isInteger(m.month)||m.month<1||m.month>12||!Number.isFinite(m.energy)||!Number.isFinite(m.irradiation)||m.irradiation===0&&m.energy>0))throw new Error('monthly_simulation_required');if(!d.simulationTool||!d.weatherSource||!d.simulationFileId)throw new Error('simulation_source_required');await attachment(ctx,d.simulationFileId,[id??'',d.projectId]);const energy=d.simulationMonthly.reduce((n:number,r:any)=>n+r.energy,0),irradiation=d.simulationMonthly.reduce((n:number,r:any)=>n+r.irradiation,0);if(!irradiation)throw new Error('invalid_irradiation');d.annualEnergy=energy;d.yield=energy/d.capacity;d.performanceRatio=energy/(d.capacity*irradiation);}
 if(kind==='stegConnectors')throw new Error('use_steg_connector');
 if(['stegChecks','technicalPlans','cableCuts','cableReturns'].includes(kind)&&d.status!=='draft')throw new Error('use_business_action');
 if(kind==='cableDrums'&&d.status!=='draft')throw new Error('use_business_action');
 if(kind==='dossiers'&&id){const previous=await record(ctx,id,'dossiers');for(const k of ['networkSnapshot','checklist','clientSnapshot','siteSnapshot','createdFrom','legalRegime','legalChecklist','legalReferences'])if(previous.data[k]!==undefined)d[k]=previous.data[k];}
 if(kind==='dossiers'){
 const p=await record(ctx,d.projectId,'projects'),{client,site}=await projectSite(ctx,p);if(d.clientId!==client.id)throw new Error('client_project_mismatch');
 const network=stegNetwork(p.data.capacity,site.data.connection,site.data.subscribedKva,p.data.inverterKva);if(d.capacity!==p.data.capacity)throw new Error('dossier_capacity_mismatch');d.voltage=network.voltage;
 if(['ready','submitted'].includes(d.status)){const check=await record(ctx,d.checkId,'stegChecks');if(check.data.projectId!==p.id||check.data.siteId!==site.id||check.data.reference!==site.data.stegRef||check.data.siteRevision!==site.revision||check.data.validUntil<tunisToday()||check.data.status!=='verified'||check.data.result!=='paid'||check.data.balance!==0)throw new Error('steg_payment_not_verified');d.networkSnapshot=network;d.clientSnapshot=client.data;d.siteSnapshot=site.data;d.legalRegime=p.data.legalRegime;d.legalChecklist=legalChecklist(network.voltage,p.data.legalRegime);d.legalReferences=STEG_LEGAL_REFERENCES;d.checklist=stegChecklist(network.voltage);}
 for(const row of d.annexes??[])await attachment(ctx,row.fileId,[id??'',d.projectId,d.clientId]);if(['ready','submitted'].includes(d.status)){if(!d.legalReviewer||!d.legalReviewFileId)throw new Error('legal_review_required');await attachment(ctx,d.legalReviewFileId,[id??'']);const rs=await all(ctx.owner),files=(await db().prepare('SELECT id,record_id,filename FROM files WHERE owner=?').bind(ctx.owner).all<any>()).results;const missing=dossierReadiness({id:id??'',kind:'dossiers',data:d} as Entry,rs,files);if(missing.length)throw new Error('dossier_incomplete:'+missing.join(' | '));}}
 if(kind==='dossiers'&&['approved','reception','commissioned'].includes(d.status))throw new Error('use_steg_decision');
 if(['stegChecks','technicalPlans','cableCuts'].includes(kind)){const p=await record(ctx,d.projectId,'projects');d.agencyId=p.data.agencyId;if(d.clientId&&d.clientId!==p.data.clientId)throw new Error('client_project_mismatch');if(kind==='stegChecks'){const {site}=await projectSite(ctx,p);if(d.siteId!==site.id||d.reference!==site.data.stegRef)throw new Error('steg_reference_mismatch');}if(kind==='technicalPlans'){const dossier=await record(ctx,d.dossierId,'dossiers');if(dossier.data.projectId!==p.id)throw new Error('invalid_reference');}}
 if(kind==='cableDrums'){const p=await record(ctx,d.productId,'products'),w=await record(ctx,d.warehouse,'warehouses');if(p.data.category!=='cable'||p.data.unit!=='meter'||p.data.tracking==='serialTracking')throw new Error('meter_cable_required');d.agencyId=w.data.agencyId;const duplicate=await db().prepare("SELECT id FROM records WHERE owner=? AND kind='cableDrums' AND archived=0 AND json_extract(data,'$.lot')=? AND id!=?").bind(ctx.owner,d.lot,id??'').first();if(duplicate)throw new Error('duplicate_cable_lot');}
 if(kind==='cableReturns'){const cut=await record(ctx,d.cutId,'cableCuts'),w=await record(ctx,d.warehouse,'warehouses');d.projectId=cut.data.projectId;d.agencyId=w.data.agencyId;}
 if(kind==='supplierInvoices'){
  const supplier=await record(ctx,d.supplierId,'suppliers');if(d.orderId){const order=await record(ctx,d.orderId,'orders');if(order.data.supplierId!==supplier.id)throw new Error('supplier_invoice_mismatch');d.agencyId=order.data.agencyId;}
  const duplicate=await db().prepare("SELECT id FROM records WHERE owner=? AND kind='supplierInvoices' AND archived=0 AND json_extract(data,'$.supplierId')=? AND json_extract(data,'$.reference')=? AND id!=?").bind(ctx.owner,d.supplierId,d.reference,id??'').first();if(duplicate)throw new Error('duplicate_supplier_invoice');
  if(d.status==='issued'){const s=supplier.data;if(!['yes','no'].includes(s.rsEnabled)||!s.rsPolicySource)throw new Error('supplier_tax_policy_required');if(s.rsEnabled==='yes'&&(!s.rsCode||!Number.isFinite(s.rsRate)))throw new Error('supplier_tax_policy_required');d.rsSnapshot={rsEnabled:s.rsEnabled,rsRate:s.rsRate??0,rsVatRate:s.rsVatRate??0,rsCode:s.rsCode,rsPolicySource:s.rsPolicySource};d.supplierSnapshot={beneficiaryName:s.name,identifierType:'MatriculeFiscal',identifier:s.taxId,category:s.rsCategory,resident:s.rsResident,address:s.address,email:s.email,phone:s.phone};}
 }
 if(kind==='payments'&&d.direction==='outgoing'&&d.supplierId&&d.status==='cleared'&&!d.supplierInvoiceId){const s=await record(ctx,d.supplierId,'suppliers');if(s.data.rsEnabled==='yes')throw new Error('supplier_invoice_required');}
}
export async function verifyStegEvidence(ctx:Access,e:Entry){
 if(e.kind!=='stegChecks'||e.data.status!=='draft')throw new Error('invalid_status');const p=await record(ctx,e.data.projectId,'projects'),{site}=await projectSite(ctx,p);
 if(site.id!==e.data.siteId||site.data.stegRef!==e.data.reference)throw new Error('steg_reference_mismatch');
 if(!['paid','unpaid'].includes(e.data.result)||e.data.balance===undefined||e.data.result==='paid'&&e.data.balance!==0||e.data.result==='unpaid'&&e.data.balance<=0)throw new Error('invalid_steg_balance');
 if(e.data.date>tunisToday()||!e.data.validUntil||e.data.validUntil<tunisToday()||e.data.validUntil>new Date(Date.parse(e.data.date+'T12:00:00Z')+30*86400000).toISOString().slice(0,10))throw new Error('steg_check_expired');
 await attachment(ctx,e.data.proofFileId,[e.id,p.id,site.id,p.data.clientId]);
 await db().batch([guard(ctx,e),guard(ctx,site),update(ctx,e,{...e.data,status:'verified',source:'manualEvidence',verifiedBy:ctx.actor,verifiedAt:new Date().toISOString(),siteRevision:site.revision})]);return {id:e.id};
}
export async function createStegDossier(ctx:Access,p:Entry){
 if(p.kind!=='projects')throw new Error('invalid_reference');assertModule(ctx,'dossiers','add');const {client,site}=await projectSite(ctx,p);
 const records=await all(ctx.owner);const existing=records.find(r=>r.kind==='dossiers'&&r.data.projectId===p.id&&!['refused','cancelled'].includes(r.data.status));if(existing&&isLocked(existing)){assertRecord(ctx,existing);return {id:existing.id};}
 const check=records.filter(r=>r.kind==='stegChecks'&&r.data.projectId===p.id&&r.data.status==='verified'&&r.data.reference===site.data.stegRef&&r.data.siteRevision===site.revision&&r.data.validUntil>=tunisToday()).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
 if(!check||check.data.result!=='paid'||check.data.balance!==0)throw new Error('steg_payment_not_verified');assertRecord(ctx,check);
 const network=stegNetwork(p.data.capacity,site.data.connection,site.data.subscribedKva,p.data.inverterKva);
 if(existing){assertRecord(ctx,existing,true);await db().batch([guard(ctx,existing),guard(ctx,p),guard(ctx,site),guard(ctx,check),update(ctx,existing,{...existing.data,checkId:check.id,capacity:p.data.capacity,voltage:network.voltage,networkSnapshot:network,clientSnapshot:client.data,siteSnapshot:site.data,checklist:stegChecklist(network.voltage),legalRegime:p.data.legalRegime,legalChecklist:legalChecklist(network.voltage,p.data.legalRegime),status:'incomplete'})]);return {id:existing.id};}
 const data=validate('dossiers',{name:`Dossier STEG ${network.voltage} · ${p.data.name}`,clientId:client.id,projectId:p.id,agencyId:p.data.agencyId,checkId:check.id,regime:p.data.regime??'outsideProsol',district:site.data.district,voltage:network.voltage,capacity:p.data.capacity,status:'incomplete'});const id=crypto.randomUUID();
 await db().batch([guard(ctx,p),guard(ctx,site),guard(ctx,check),insert(ctx,'dossiers',{...data,legalRegime:p.data.legalRegime,legalChecklist:legalChecklist(network.voltage,p.data.legalRegime),legalReferences:STEG_LEGAL_REFERENCES,networkSnapshot:network,checklist:stegChecklist(network.voltage),clientSnapshot:client.data,siteSnapshot:site.data,createdFrom:'technicalWorkflow'},id)]);return {id};
}
export async function createPlan(ctx:Access,dossier:Entry){
 if(dossier.kind!=='dossiers')throw new Error('invalid_reference');assertModule(ctx,'technicalPlans','add');const p=await record(ctx,dossier.data.projectId,'projects');
 const existing=(await all(ctx.owner)).find(r=>r.kind==='technicalPlans'&&r.data.dossierId===dossier.id);if(existing){assertRecord(ctx,existing);return {id:existing.id};}
 const id=crypto.randomUUID();await insert(ctx,'technicalPlans',{name:'Plan technique · '+p.data.name,agencyId:p.data.agencyId,clientId:p.data.clientId,projectId:p.id,dossierId:dossier.id,capacity:p.data.capacity,status:'draft'},id).run();return {id};
}
async function generatedPlan(ctx:Access,e:Entry){
 const p=await record(ctx,e.data.projectId,'projects'),dossier=await record(ctx,e.data.dossierId,'dossiers');if(dossier.data.projectId!==p.id||e.data.clientId!==p.data.clientId)throw new Error('invalid_reference');
 await attachment(ctx,e.data.surveyFileId,[e.id,p.id,p.data.siteId]);for(const r of e.data.routes??[]){const product=await record(ctx,r.productId,'products');if(product.data.category!=='cable'||product.data.unit!=='meter')throw new Error('meter_cable_required');}
 const snapshot=technicalDesign(e.data);const site=await record(ctx,p.data.siteId,'sites');if(dossier.data.voltage==='BT'){if(!e.data.inverterKva||!site.data.subscribedKva)throw new Error('apparent_power_required');if(e.data.inverterKva<e.data.inverterKw||e.data.inverterKva>site.data.subscribedKva||e.data.inverterKva>200||site.data.connection==='singlePhase'&&e.data.inverterKva>6)throw new Error('bt_apparent_power_limit');if(e.data.routes.some((r:any)=>r.kind!=='earth'&&r.dropLimit>3)||snapshot.routes.some(r=>r.dropPercent>3))throw new Error('bt_voltage_drop_limit');}if(snapshot.actualKwc>Number(dossier.data.capacity??p.data.capacity)+1e-8)throw new Error('design_exceeds_approved_capacity');return {...e.data,snapshot,status:'generated',generatedBy:ctx.actor,generatedAt:new Date().toISOString(),dossierRevision:dossier.revision,projectRevision:p.revision};
}
export async function approveSteg(ctx:Access,e:Entry,b:any){
 if(e.kind!=='dossiers'||!['submitted','complement','ready'].includes(e.data.status))throw new Error('invalid_status');
 if(!b.reference?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(b.date??'')||b.date>tunisToday())throw new Error('steg_decision_required');await attachment(ctx,b.fileId,[e.id]);
 const plans=(await all(ctx.owner)).filter(r=>r.kind==='technicalPlans'&&r.data.dossierId===e.id&&r.data.status==='draft'),batch=[guard(ctx,e)];let generated=0;
 for(const plan of plans){assertRecord(ctx,plan,true);if(plan.data.surveyFileId&&plan.data.roofWidth&&plan.data.routes?.length){batch.push(guard(ctx,plan),update(ctx,plan,{...await generatedPlan(ctx,plan),dossierRevision:e.revision+1}));generated++;}}
 batch.push(update(ctx,e,{...e.data,status:'approved',reference:b.reference.trim(),approvalFileId:b.fileId,approvalDate:b.date,approvedBy:ctx.actor,approvedAt:new Date().toISOString()}));await db().batch(batch);
 if(!plans.length)return {...await createPlan(ctx,{...e,data:{...e.data,status:'approved'}}),generated:0};return {id:e.id,generated};
}
export async function generateStudyPlan(ctx:Access,e:Entry){if(e.kind!=='technicalPlans'||e.data.status!=='draft')throw new Error('invalid_status');const generated=await generatedPlan(ctx,e);await db().batch([guard(ctx,e),update(ctx,e,{...e.data,studySnapshot:generated.snapshot,studyGeneratedAt:new Date().toISOString(),studyGeneratedBy:ctx.actor})]);return {id:e.id};}
export async function generatePlan(ctx:Access,e:Entry){
 if(e.kind!=='technicalPlans'||e.data.status!=='draft')throw new Error('invalid_status');const dossier=await record(ctx,e.data.dossierId,'dossiers');if(dossier.data.status!=='approved'||!dossier.data.approvalFileId)throw new Error('steg_approval_required');await attachment(ctx,dossier.data.approvalFileId,[dossier.id]);
 await db().batch([guard(ctx,e),guard(ctx,dossier),update(ctx,e,await generatedPlan(ctx,e))]);return {id:e.id};
}
export async function reviewPlan(ctx:Access,e:Entry,b:any){
 if(e.kind!=='technicalPlans'||e.data.status!=='generated'||!b.reviewer?.trim())throw new Error('engineering_review_required');await attachment(ctx,b.fileId,[e.id]);
 await db().batch([guard(ctx,e),update(ctx,e,{...e.data,status:'reviewed',reviewer:b.reviewer.trim(),reviewFileId:b.fileId,reviewedBy:ctx.actor,reviewedAt:new Date().toISOString()})]);return {id:e.id};
}
export async function reservePlan(ctx:Access,e:Entry,b:any){
 if(e.kind!=='technicalPlans'||e.data.status!=='reviewed'||!e.data.snapshot||e.data.reservedAt)throw new Error('engineering_review_required');assertModule(ctx,'reservations','add');const w=await record(ctx,b.warehouse,'warehouses'),project=await record(ctx,e.data.projectId,'projects'),dossier=await record(ctx,e.data.dossierId,'dossiers');if(project.revision!==e.data.projectRevision||dossier.revision!==e.data.dossierRevision||dossier.data.status!=='approved')throw new Error('design_reference_changed');const batch=[guard(ctx,e),guard(ctx,project),guard(ctx,dossier)];
 for(const row of e.data.snapshot.bom){const id=e.id+'-reserve-'+row.productId;const data=validate('reservations',{name:'Câbles · '+e.data.name,warehouse:w.id,productId:row.productId,projectId:e.data.projectId,quantity:row.meters,date:tunisToday(),status:'reserved',agencyId:w.data.agencyId});assertRecord(ctx,{id,kind:'reservations',data},'add');batch.push(insert(ctx,'reservations',data,id));}
 batch.push(update(ctx,e,{...e.data,reservedAt:new Date().toISOString(),reservationWarehouse:w.id}));await db().batch(batch);return {id:e.id};
}
export async function activateDrum(ctx:Access,e:Entry){
 if(e.kind!=='cableDrums'||e.data.status!=='draft')throw new Error('invalid_status');const p=await record(ctx,e.data.productId,'products'),w=await record(ctx,e.data.warehouse,'warehouses');
 if(p.data.category!=='cable'||p.data.unit!=='meter'||p.data.tracking==='serialTracking')throw new Error('meter_cable_required');
 const assigned=await db().prepare("SELECT COALESCE(SUM(json_extract(data,'$.remainingLength')),0) n FROM records WHERE owner=? AND kind='cableDrums' AND archived=0 AND json_extract(data,'$.status')='active' AND json_extract(data,'$.productId')=? AND json_extract(data,'$.warehouse')=?").bind(ctx.owner,p.id,w.id).first<any>();const stock=await db().prepare('SELECT quantity FROM stock_balances WHERE owner=? AND product_id=? AND warehouse=?').bind(ctx.owner,p.id,w.id).first<any>();
 if(Math.round((assigned.n+e.data.initialLength)*1000)>(stock?.quantity??0))throw new Error('drum_exceeds_existing_stock');
 await db().batch([guard(ctx,e),guard(ctx,p),db().prepare('UPDATE records SET revision=revision+1 WHERE id=? AND owner=?').bind(p.id,ctx.owner),update(ctx,e,{...e.data,status:'active',remainingLength:e.data.initialLength,openedAt:new Date().toISOString(),agencyId:w.data.agencyId})]);return {id:e.id};
}
export async function transferDrum(ctx:Access,e:Entry,b:any){if(e.kind!=='cableDrums'||e.data.status!=='active'||e.data.remainingLength<=0)throw new Error('invalid_status');const w=await record(ctx,b.warehouse,'warehouses');if(w.id===e.data.warehouse)throw new Error('invalid_transfer');const next={...e.data,warehouse:w.id,agencyId:w.data.agencyId};assertRecord(ctx,{...e,data:next},true);const row={productId:e.data.productId,quantity:e.data.remainingLength};await db().batch([guard(ctx,e),await movement(ctx,row,w.id,'stockIn',e,{drumId:e.id}),update(ctx,e,next),await movement(ctx,row,e.data.warehouse,'stockOut',e,{drumId:e.id})]);return {id:e.id};}
export async function cutCable(ctx:Access,e:Entry){
 if(e.kind!=='cableCuts'||e.data.status!=='draft')throw new Error('invalid_status');const drum=await record(ctx,e.data.drumId,'cableDrums',true),p=await record(ctx,e.data.projectId,'projects');const length=Math.round((e.data.length+(e.data.wasteLength??0))*1000)/1000;
 if(drum.data.status!=='active'||Math.round(length*1000)>Math.round(drum.data.remainingLength*1000))throw new Error('insufficient_drum_length');
 const parent={...e,data:{...e.data,agencyId:drum.data.agencyId}};const m=await movement(ctx,{productId:drum.data.productId,quantity:length},drum.data.warehouse,'stockOut',parent,{drumId:drum.id,cutId:e.id});
 const reservations=(await all(ctx.owner)).filter(r=>r.kind==='reservations'&&r.data.projectId===p.id&&r.data.productId===drum.data.productId&&r.data.warehouse===drum.data.warehouse&&r.data.status==='reserved');let release=length;const batch=[guard(ctx,e),guard(ctx,drum)];
 for(const r of reservations){if(!release)break;assertRecord(ctx,r,true);const taken=Math.min(release,r.data.quantity);batch.push(guard(ctx,r),update(ctx,r,{...r.data,quantity:r.data.quantity-taken,status:taken===r.data.quantity?'released':'reserved'}));release-=taken;}
 batch.push(update(ctx,drum,{...drum.data,remainingLength:Math.round((drum.data.remainingLength-length)*1000)/1000}),m,update(ctx,e,{...e.data,status:'posted',productId:drum.data.productId,warehouse:drum.data.warehouse,agencyId:drum.data.agencyId,consumedLength:length,postedAt:new Date().toISOString()}));await db().batch(batch);return {id:e.id};
}
export async function returnCable(ctx:Access,e:Entry){
 if(e.kind!=='cableReturns'||e.data.status!=='draft')throw new Error('invalid_status');const cut=await record(ctx,e.data.cutId,'cableCuts',true);if(cut.data.status!=='posted')throw new Error('invalid_status');const returns=(await all(ctx.owner)).filter(r=>r.kind==='cableReturns'&&r.data.cutId===cut.id&&r.data.status==='posted');if(returns.reduce((n,r)=>n+r.data.length,0)+e.data.length>cut.data.length+1e-8)throw new Error('cable_return_exceeds_cut');const w=await record(ctx,e.data.warehouse,'warehouses'),drumId=e.id+'-offcut';const parent={...e,data:{...e.data,projectId:cut.data.projectId,agencyId:w.data.agencyId}};
 await db().batch([guard(ctx,e),guard(ctx,cut),db().prepare('UPDATE records SET revision=revision+1 WHERE id=? AND owner=?').bind(cut.id,ctx.owner),await movement(ctx,{productId:cut.data.productId,quantity:e.data.length},w.id,'stockIn',parent,{cutId:cut.id}),insert(ctx,'cableDrums',{name:'Chute · '+e.data.name,productId:cut.data.productId,warehouse:w.id,form:'offcut',lot:drumId,initialLength:e.data.length,remainingLength:e.data.length,sourceCutId:cut.id,agencyId:w.data.agencyId,date:e.data.date,status:'active'},drumId),update(ctx,e,{...parent.data,status:'posted',drumId,postedAt:new Date().toISOString()})]);return {id:drumId};
}
export async function saveSupplierPayment(ctx:Access,d:any,b:any){
 const id=b.id??b.requestId??crypto.randomUUID();if(typeof id!=='string'||!/^[a-zA-Z0-9-]{8,160}$/.test(id))throw new Error('invalid_request_id');
 const old=await db().prepare('SELECT * FROM records WHERE id=? AND owner=?').bind(id,ctx.owner).first<any>();
 if(old&&!b.id){assertRecord(ctx,{...old,data:JSON.parse(old.data)},'add');const previous=JSON.parse(old.data);if(old.kind!=='payments'||previous.supplierInvoiceId!==d.supplierInvoiceId||previous.amount!==d.amount||previous.date!==d.date||previous.method!==d.method||previous.status!==d.status)throw new Error('idempotency_conflict');return {id};}
 if(old&&b.id){const previous={...old,data:JSON.parse(old.data)} as Entry;assertRecord(ctx,previous,true);if(old.kind!=='payments'||isLocked(previous)||old.revision!==b.revision)throw new Error('conflict');}
 if(b.id&&!old)throw new Error('not_found');
 const invoice=await record(ctx,d.supplierInvoiceId,'supplierInvoices',true);if(invoice.data.status!=='issued'||invoice.data.supplierId!==d.supplierId||d.direction!=='outgoing'||d.employeeId||d.clientId||d.installmentId||d.allocations?.length)throw new Error('supplier_invoice_mismatch');d.agencyId=invoice.data.agencyId;assertRecord(ctx,{id,kind:'payments',data:d},old?'edit':'add');
 const prior=(await all(ctx.owner)).filter(r=>r.kind==='payments'&&r.data.supplierInvoiceId===invoice.id&&r.data.status==='cleared'&&r.id!==id);const totalPaid=prior.reduce((n,r)=>n+r.data.amount,0);
 if(totalPaid+d.amount>invoice.data.total)throw new Error('supplier_overpayment');
 const result=supplierSettlement(invoice.data,d.amount,prior.map(r=>r.data),invoice.data.rsSnapshot);Object.assign(d,result);const batch=[guard(ctx,invoice)],certificates:D1PreparedStatement[]=[];
 if(old)batch.push(guard(ctx,{...old,data:JSON.parse(old.data)} as Entry));
 if(d.status==='cleared'){
  if(result.withheld>0){assertModule(ctx,'withholdings','add');const data=validate('withholdings',{name:'RS · '+d.name,paymentId:id,direction:'issued',date:d.date,reference:'RS-'+id,operation:'add',...invoice.data.supplierSnapshot,operations:result.operations,status:'draft',agencyId:d.agencyId});data.operations=result.operations;Object.assign(data,retentionAmounts(data.operations),checkTaxpayer(data),{status:'validated',supplierInvoiceId:invoice.id,sourceInvoiceRevision:invoice.revision,automatic:true,validatedBy:ctx.actor,validatedAt:new Date().toISOString()});const certificate=id+'-withholding';d.withholdingId=certificate;certificates.push(insert(ctx,'withholdings',data,certificate));}
  batch.push(update(ctx,invoice,{...invoice.data,paidGross:totalPaid+d.amount,remainingGross:invoice.data.total-totalPaid-d.amount}));
 }
 // The payment must precede its certificate because the fiscal FK/guards refer to it.
 const rest=batch;
 if(old)rest.push(update(ctx,{...old,data:JSON.parse(old.data)} as Entry,d));else rest.push(insert(ctx,'payments',d,id));rest.push(...certificates);await db().batch(rest);return {id};
}
export async function supplierCancellation(ctx:Access,p:Entry){
 if(!p.data.supplierInvoiceId)return [];const invoice=await record(ctx,p.data.supplierInvoiceId,'supplierInvoices',true),batch=[guard(ctx,invoice),update(ctx,invoice,{...invoice.data,paidGross:Math.max(0,(invoice.data.paidGross??0)-p.data.amount),remainingGross:(invoice.data.remainingGross??0)+p.data.amount})];
 if(p.data.withholdingId){const cert=await record(ctx,p.data.withholdingId,'withholdings',true);if(cert.data.status==='submitted')throw new Error('submitted_withholding_requires_rectification');batch.push(guard(ctx,cert),insert(ctx,'withholdings',{...cert.data,name:'Annulation · '+cert.data.name,operation:'cancel',automatic:true,status:'validated',cancelledAt:new Date().toISOString()},p.id+'-withholding-cancel'));}return batch;
}
