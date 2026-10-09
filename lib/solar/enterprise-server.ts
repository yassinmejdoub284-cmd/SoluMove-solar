import {db,assertAdmin,assertModule,assertRecord,visible,type Access} from './server';
import {all,record,insert,guard,update,movement} from './business-server';
import {validate,type Entry} from './domain';
import {retentionAmounts,tunisToday,effectiveWithholdings,dashboardReport} from './enterprise-domain';
import {checkTaxpayer} from './fiscal';
export async function validateEnterpriseSave(ctx:Access,kind:string,d:any,id?:string){
 if(['exitNotes','clientTransfers'].includes(kind)&&d.status!=='draft')throw new Error('use_business_action');
 if(kind==='withholdings'){if(d.status!=='draft')throw new Error('use_business_action');checkTaxpayer(d);Object.assign(d,retentionAmounts(d.operations));const p=await record(ctx,d.paymentId,'payments');d.agencyId=p.data.agencyId;if(d.date!==p.data.date||d.direction!==(p.data.direction==='incoming'?'received':'issued'))throw new Error('payment_mismatch');}
 if(kind==='clientTransfers'){const client=await record(ctx,d.clientId,'clients');d.agencyId=client.data.agencyId;d.fromAgencyId=client.data.agencyId;}
 if(kind==='exitNotes'){const w=await record(ctx,d.warehouse,'warehouses');d.agencyId=w.data.agencyId;}
 if(kind==='transferOrders'){const from=await record(ctx,d.from,'warehouses'),to=await record(ctx,d.to,'warehouses');if(from.id===to.id)throw new Error('invalid_transfer');d.agencyId=from.data.agencyId;d.destinationAgencyId=to.data.agencyId;}
 if(kind==='invoices'&&d.invoiceType==='creditNote'){const original=await record(ctx,d.originalId,'invoices');if(original.data.invoiceType==='creditNote'||original.data.status!=='issued'||original.data.clientId!==d.clientId||original.data.agencyId!==d.agencyId)throw new Error('invalid_credit_note');}
 if(kind==='vehicles'&&id){const old=await record(ctx,id,'vehicles');for(const key of ['keyHolderId','keyHandoverId','keyUpdatedAt'])if(old.data[key]!==undefined)d[key]=old.data[key];if(d.odometer<(old.data.odometer??0))throw new Error('invalid_odometer');}
 if(kind==='products'&&id){const old=await record(ctx,id,'products');if(old.data.tracking!==d.tracking){const count=await db().prepare('SELECT COUNT(*) AS n FROM stock_balances WHERE owner=? AND product_id=? AND quantity!=0').bind(ctx.owner,id).first<{n:number}>();if(count?.n)throw new Error('tracking_stock_exists');}}
 if(kind==='minutes'&&d.status==='finalized'){if(!d.resolutions?.length)throw new Error('resolutions_required');d.finalizedBy=ctx.actor;d.finalizedAt=new Date().toISOString();}
 if(['vehicleMaintenance','maintenanceJobs'].includes(kind)){const vehicle=await record(ctx,d.vehicleId,'vehicles');d.agencyId=vehicle.data.agencyId;}
 if(kind==='maintenanceJobs'&&d.status==='completed')throw new Error('use_business_action');
 if(kind==='vatReturns'&&d.status!=='draft')throw new Error('use_business_action');
 if(kind==='vatReturns'){assertAdmin(ctx);if(d.startDate>d.endDate)throw new Error('invalid_period');}
 if(kind==='roles'&&new Set(d.rules.map((r:any)=>r.module)).size!==d.rules.length)throw new Error('duplicate_permission');
}
export async function postExit(ctx:Access,e:Entry){
 if(e.kind!=='exitNotes'||e.data.status!=='draft')throw new Error('already_posted');
 const batch=[guard(ctx,e)];for(const item of e.data.items)batch.push(await movement(ctx,item,e.data.warehouse,'stockOut',e));
 batch.push(update(ctx,e,{...e.data,status:'posted',postedAt:new Date().toISOString()}));await db().batch(batch);return {ok:true};
}
export async function transferClient(ctx:Access,e:Entry){
 if(e.kind!=='clientTransfers'||e.data.status!=='draft')throw new Error('already_posted');
 const client=await record(ctx,e.data.clientId,'clients',true),to=await record(ctx,e.data.toAgencyId,'agencies');
 if(client.data.agencyId!==e.data.fromAgencyId)throw new Error('conflict');
 const destination={...client,data:{...client.data,agencyId:to.id}};assertRecord(ctx,destination,true);
 const batch=[guard(ctx,e),guard(ctx,client),update(ctx,client,destination.data)];let count=1;
 // Historical fiscal/payment/stock documents retain their issuing branch.
 if(e.data.includeOpen==='yes')for(const r of await all(ctx.owner))if(['sites','projects','leads','visits','tickets','quotes','dossiers'].includes(r.kind)&&r.data.clientId===client.id&&!['commissioned','completed','closed','resolved','accepted','rejected','cancelled','signed'].includes(r.data.status)){
  assertRecord(ctx,r,true);assertRecord(ctx,{...r,data:{...r.data,agencyId:to.id}},true);batch.push(guard(ctx,r),update(ctx,r,{...r.data,agencyId:to.id}));count++;
 }
 batch.push(update(ctx,e,{...e.data,status:'posted',transferredAt:new Date().toISOString(),transferredCount:count}));await db().batch(batch);return {ok:true,count};
}
export async function handKeys(ctx:Access,b:any){
 assertModule(ctx,'vehicleKeys','add');const vehicle=await record(ctx,b.vehicleId,'vehicles',true),employee=await record(ctx,b.employeeId,'employees');
 if(vehicle.data.status!=='active'||employee.data.status!=='active')throw new Error('vehicle_unavailable');
 if(vehicle.data.keyHolderId)throw new Error('vehicle_already_held');
 const d=validate('vehicleKeys',{name:`Clés · ${vehicle.data.registration}`,vehicleId:vehicle.id,employeeId:employee.id,date:tunisToday(),purpose:b.purpose,startKm:b.startKm,conditionOut:b.conditionOut,expectedReturn:b.expectedReturn,status:'held',agencyId:vehicle.data.agencyId});
 if(d.startKm!==undefined&&d.startKm<(vehicle.data.odometer??0))throw new Error('invalid_odometer');
 assertRecord(ctx,{id:'',kind:'vehicleKeys',data:d} as Entry,'add');const id=crypto.randomUUID();
 await db().batch([guard(ctx,vehicle),insert(ctx,'vehicleKeys',{...d,handedAt:new Date().toISOString(),handedBy:ctx.actor},id),update(ctx,vehicle,{...vehicle.data,keyHolderId:employee.id,keyHandoverId:id,keyUpdatedAt:new Date().toISOString(),odometer:d.startKm??vehicle.data.odometer??0})]);return {id};
}
export async function returnKeys(ctx:Access,e:Entry,b:any){
 if(e.kind!=='vehicleKeys'||e.data.status!=='held')throw new Error('invalid_status');const vehicle=await record(ctx,e.data.vehicleId,'vehicles',true);
 if(vehicle.data.keyHandoverId!==e.id)throw new Error('conflict');if(!Number.isFinite(b.endKm)||b.endKm<(vehicle.data.odometer??0)||!String(b.conditionIn??'').trim())throw new Error('invalid_odometer');
 await db().batch([guard(ctx,e),guard(ctx,vehicle),update(ctx,e,{...e.data,status:'returned',endKm:b.endKm,conditionIn:String(b.conditionIn).slice(0,12000),returnedAt:new Date().toISOString(),returnedBy:ctx.actor}),update(ctx,vehicle,{...vehicle.data,keyHolderId:null,keyHandoverId:null,keyUpdatedAt:new Date().toISOString(),odometer:b.endKm})]);return {ok:true};
}
export async function completeMaintenance(ctx:Access,e:Entry){
 if(e.kind!=='maintenanceJobs'||e.data.status!=='draft')throw new Error('invalid_status');const vehicle=await record(ctx,e.data.vehicleId,'vehicles',true);
 if(e.data.odometer===undefined||e.data.odometer<(vehicle.data.odometer??0))throw new Error('invalid_odometer');const batch=[guard(ctx,e),guard(ctx,vehicle)];
 if(e.data.planId){const plan=await record(ctx,e.data.planId,'vehicleMaintenance',true);if(plan.data.vehicleId!==vehicle.id)throw new Error('invalid_reference');const nextDate=new Date(e.data.date+'T12:00:00Z');nextDate.setUTCMonth(nextDate.getUTCMonth()+(plan.data.intervalMonths??0));batch.push(guard(ctx,plan),update(ctx,plan,{...plan.data,lastKm:e.data.odometer,lastDate:e.data.date,nextKm:e.data.nextKm??e.data.odometer+(plan.data.intervalKm??0),nextDate:e.data.nextDate??(plan.data.intervalMonths?nextDate.toISOString().slice(0,10):undefined)}));}
 batch.push(update(ctx,vehicle,{...vehicle.data,odometer:e.data.odometer}),update(ctx,e,{...e.data,status:'completed',completedAt:new Date().toISOString()}));await db().batch(batch);return {ok:true};
}
export async function issueWithholding(ctx:Access,e:Entry){
 if(e.kind!=='withholdings'||e.data.status!=='draft')throw new Error('invalid_status');const p=await record(ctx,e.data.paymentId,'payments');if(p.data.status!=='cleared')throw new Error('payment_not_cleared');
 const a=checkTaxpayer(e.data);if(a.total>p.data.amount||p.data.date!==e.data.date)throw new Error('payment_mismatch');
 const rows=await all(ctx.owner),related=rows.filter(r=>r.kind==='withholdings'&&r.id!==e.id&&r.data.direction===e.data.direction&&r.data.reference===e.data.reference&&['validated','submitted'].includes(r.data.status));
 if(e.data.operation!=='add'){const initial=related.find(r=>r.data.operation==='add');if(!initial||initial.data.paymentId!==p.id||initial.data.date!==e.data.date||related.some(r=>r.data.operation==='cancel'))throw new Error('original_certificate_required');for(const r of related)assertRecord(ctx,r,true);}
 const effective=effectiveWithholdings([...rows,{...e,data:{...e.data,...a,status:'validated'}}]).filter(r=>r.data.paymentId===p.id);if(effective.reduce((n,r)=>n+r.data.total,0)>p.data.amount)throw new Error('retention_exceeds_payment');
 // Updating the payment revision serializes all certificates for that payment.
 await db().batch([guard(ctx,e),guard(ctx,p),...related.map(r=>guard(ctx,r)),update(ctx,p,{...p.data,withholdingRevision:(p.data.withholdingRevision??0)+1}),update(ctx,e,{...e.data,...a,status:'validated',validatedAt:new Date().toISOString(),validatedBy:ctx.actor})]);return {ok:true};
}
export async function applyCredit(ctx:Access,e:Entry){
 if(e.kind!=='invoices'||e.data.invoiceType!=='creditNote'||e.data.status!=='issued'||e.data.appliedAt)throw new Error('invalid_credit_note');
 const original=await record(ctx,e.data.originalId,'invoices',true),batch=[guard(ctx,e),guard(ctx,original)];let remaining=e.data.total;
 const allocations=(await db().prepare('SELECT installment_id,SUM(amount) AS paid FROM allocations WHERE owner=? GROUP BY installment_id').bind(ctx.owner).all()).results as any[];
 const dues=(await all(ctx.owner)).filter(r=>r.kind==='installments'&&r.data.invoiceId===original.id&&r.data.status!=='restructured').sort((a,b)=>b.data.dueDate.localeCompare(a.data.dueDate));
 const applied:any[]=[];for(const r of dues){if(!remaining)break;assertRecord(ctx,r,true);const paid=allocations.find(a=>a.installment_id===r.id)?.paid??0,used=Math.min(remaining,Math.max(0,r.data.amount-paid));if(used){batch.push(guard(ctx,r),update(ctx,r,{...r.data,amount:r.data.amount-used,creditAmount:(r.data.creditAmount??0)+used}));applied.push({installmentId:r.id,amount:used});remaining-=used;}}
 if(remaining)throw new Error('credit_refund_or_schedule_required');batch.push(update(ctx,e,{...e.data,appliedAt:new Date().toISOString(),creditAllocations:applied}));await db().batch(batch);return {ok:true};
}
async function permittedEmails(ctx:Access){const members=(await all(ctx.owner)).filter(r=>r.kind==='users'&&r.data.status==='active');return new Set([ctx.email.toLowerCase(),process.env.SOLAR_OWNER_EMAIL?.toLowerCase(),...members.map(r=>r.data.email.toLowerCase())].filter(Boolean));}
export async function createConversation(ctx:Access,b:any){
 assertModule(ctx,'conversations','add');const permitted=await permittedEmails(ctx),emails=[...new Set([ctx.email,...(Array.isArray(b.emails)?b.emails:[])].map((s:any)=>String(s).trim().toLowerCase()))];
 if(emails.length<2||emails.length>50||emails.some(s=>!permitted.has(s)))throw new Error('invalid_chat_members');
 if(typeof b.name!=='string'||!b.name.trim()||b.name.length>200)throw new Error('required:name');const id=crypto.randomUUID();await insert(ctx,'conversations',{name:b.name.trim(),members:emails.map(email=>({email})),status:'active',agencyId:null},id).run();return {id};
}
export async function sendMessage(ctx:Access,b:any){
 assertModule(ctx,'messages','add');const chat=await record(ctx,b.conversationId,'conversations');if(chat.data.status!=='active')throw new Error('chat_closed');
 if(typeof b.message!=='string'||!b.message.trim()||b.message.length>4000)throw new Error('invalid_message');
 const id=typeof b.requestId==='string'&&/^[a-zA-Z0-9-]{8,80}$/.test(b.requestId)?b.requestId:crypto.randomUUID();
 const prior=(await all(ctx.owner)).find(r=>r.id===id);if(prior){assertRecord(ctx,prior);if(prior.data.actorId!==ctx.actor||prior.data.message!==b.message.trim()||prior.data.conversationId!==chat.id)throw new Error('idempotency_conflict');return {id};}
 const batch=[guard(ctx,chat),insert(ctx,'messages',{name:ctx.email,conversationId:chat.id,message:b.message.trim(),senderEmail:ctx.email,members:chat.data.members,status:'sent'},id)];
 // Internal notifications only; no external message or email is sent.
 for(const m of chat.data.members)if(m.email!==ctx.email.toLowerCase()){const now=new Date().toISOString();batch.push(db().prepare('INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,?, ?,1,0,0,?,?)').bind(id+'-'+m.email,ctx.owner,'notifications',JSON.stringify({name:'Message · '+chat.data.name,recipientEmail:m.email,message:b.message.trim().slice(0,120),sourceId:chat.id,status:'unread',priority:'normal',actorId:ctx.actor}),now,now));}
 await db().batch(batch);return {id};
}
export async function notify(ctx:Access,b:any){
 assertAdmin(ctx);const emails=await permittedEmails(ctx),recipient=String(b.recipientEmail??'').toLowerCase();if(!emails.has(recipient))throw new Error('invalid_recipient');
 if(typeof b.message!=='string'||!b.message.trim()||b.message.length>4000)throw new Error('invalid_message');
 const id=crypto.randomUUID();await insert(ctx,'notifications',{name:String(b.name??'Notification').slice(0,200),recipientEmail:recipient,message:b.message,status:'unread',priority:b.priority==='urgent'?'urgent':'normal'},id).run();return {id};
}
export async function acknowledge(ctx:Access,e:Entry){if(e.kind!=='notifications'||!visible(ctx,e))throw new Error('forbidden');await db().batch([guard(ctx,e),db().prepare('UPDATE records SET data=json_set(data,\'$.status\',\'read\',\'$.readAt\',?),revision=revision+1,updated_at=? WHERE owner=? AND id=?').bind(new Date().toISOString(),new Date().toISOString(),ctx.owner,e.id)]);return {ok:true};}

export async function validateVatReturn(ctx:Access,e:Entry){
 assertAdmin(ctx);if(e.kind!=='vatReturns'||e.data.status!=='draft')throw new Error('invalid_status');
 const rows=await all(ctx.owner),allocations=(await db().prepare('SELECT * FROM allocations WHERE owner=?').bind(ctx.owner).all()).results as any[];
 const data={records:rows,allocations,stock:[],files:[],serials:[],events:[],company:{}};
 const report=dashboardReport(data,{from:e.data.startDate,to:e.data.endDate,agency:e.data.agencyId??'all'});
 const adjustments=rows.filter(r=>r.kind==='vatAdjustments'&&r.data.status==='approved'&&r.data.date>=e.data.startDate&&r.data.date<=e.data.endDate&&(!e.data.agencyId||r.data.agencyId===e.data.agencyId));
 const adjustmentTotal=adjustments.reduce((n,r)=>n+(r.data.direction==='increase'?1:-1)*r.data.amount,0),balance=report.kpis.outputVat-report.kpis.inputVat+adjustmentTotal-(e.data.previousCredit??0);
 const basis=[...report.invoices,...report.purchases,...adjustments];
 await db().batch([guard(ctx,e),...basis.map(r=>guard(ctx,r)),update(ctx,e,{...e.data,status:'validated',snapshot:{outputVat:report.kpis.outputVat,inputVat:report.kpis.inputVat,adjustmentTotal,previousCredit:e.data.previousCredit??0,payable:Math.max(0,balance),credit:Math.max(0,-balance),sources:basis.map(r=>({id:r.id,revision:r.revision})),validatedAt:new Date().toISOString(),validatedBy:ctx.actor}})]);return {ok:true};
}
