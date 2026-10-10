import {db,can,visible,assertRecord,assertModule,type Access} from './server';
import {all,record,insert,update,guard} from './business-server';
import {validate,type Entry} from './domain';
import {agendaItems,agendaConflicts,agendaICS,calendarKinds,assignees,validateAgenda,validDate,addDays,tunisDate} from './agenda-domain';
export function canOpenAgenda(ctx:Access){return can(ctx,'agenda')||['planning','tasks','agendaEvents'].some(k=>can(ctx,k));}
async function employee(ctx:Access,id:string){
 const raw=await db().prepare("SELECT * FROM records WHERE owner=? AND id=? AND kind='employees' AND archived=0").bind(ctx.owner,id).first<{id:string;kind:string;data:string}>();if(!raw)throw new Error('invalid_reference');
 const e={id:raw.id,kind:'employees',data:JSON.parse(raw.data)};
 if(!ctx.admin&&id!==ctx.employeeId)assertRecord(ctx,e);if(e.data.status==='departed')throw new Error('employee_unavailable');return e;
}
export async function agendaRead(ctx:Access,b:Record<string,string>){
 if(!canOpenAgenda(ctx))throw new Error('forbidden');const from=b.from??tunisDate(),to=b.to??addDays(from,30);if(!validDate(from)||!validDate(to))throw new Error('invalid_agenda_period');
 const records=(await all(ctx.owner)).filter(e=>visible(ctx,e)),general=ctx.admin&&b.scope!=='mine';
 const selected=general?b.employeeId:ctx.employeeId;
 const items=agendaItems(records,from,to).filter(e=>(!selected?general:e.employeeIds.includes(selected))&&(!b.agencyId||e.agencyId===b.agencyId)&&(!b.projectId||e.projectId===b.projectId));
 const directory=general?records.filter(e=>e.kind==='employees'&&e.data.status!=='departed').map(e=>({id:e.id,name:e.data.name})):ctx.employeeId?[{id:ctx.employeeId,name:(await employee(ctx,ctx.employeeId)).data.name}]:[];
 const sourceIds=new Set(items.map(e=>e.recordId));
 const tasks=records.filter(e=>e.kind==='tasks'&&(general?!selected||assignees(e.data).includes(selected):!!selected&&assignees(e.data).includes(selected))&&(!b.agencyId||e.data.agencyId===b.agencyId)&&(!b.projectId||e.data.projectId===b.projectId));
 return {from,to,scope:general?'general':'mine',employeeId:ctx.employeeId,employees:directory,items,conflicts:agendaConflicts(items),tasks,records:records.filter(e=>sourceIds.has(e.id)),permissions:{add:[...calendarKinds].filter(k=>can(ctx,k,'add')),edit:[...calendarKinds].filter(k=>can(ctx,k,'edit')),delete:[...calendarKinds].filter(k=>can(ctx,k,'delete'))}};
}
export async function saveAgenda(ctx:Access,b:{kind?:string;id?:string;revision?:number;requestId?:string;data?:Entry['data']}){
 const kind=b.kind;if(typeof kind!=='string'||!calendarKinds.has(kind))throw new Error('invalid_module');assertModule(ctx,kind,b.id?'edit':'add');
 const prior=b.id?await record(ctx,b.id,kind,true):undefined;if(prior&&prior.revision!==b.revision)throw new Error('conflict');
 const id=b.id??b.requestId??crypto.randomUUID();if(typeof id!=='string'||!/^[A-Za-z0-9-]{8,160}$/.test(id))throw new Error('invalid_request_id');
 const d=validate(kind,b.data??{});validateAgenda(d,kind);
 const ids=assignees(d);if(!ctx.admin&&(!ctx.employeeId||!ids.length||ids.some(id=>id!==ctx.employeeId)))throw new Error('forbidden_assignment');
 const assigned=await Promise.all(ids.map(id=>employee(ctx,id)));
 if(d.projectId){const p=await record(ctx,d.projectId,'projects');d.agencyId=p.data.agencyId;if(d.clientId&&p.data.clientId!==d.clientId)throw new Error('client_project_mismatch');}
 if(d.clientId)await record(ctx,d.clientId,'clients');if(d.agencyId)await record(ctx,d.agencyId,'agencies');
 if(!d.agencyId&&assigned.length)d.agencyId=assigned[0].data.agencyId;
 const dependencies=(d.dependencies??[]).map((r:{taskId:string})=>r.taskId);if(dependencies.some((v:string)=>!v)||dependencies.includes(id)||new Set(dependencies).size!==dependencies.length)throw new Error('invalid_task_dependency');
 if(dependencies.length){const records=await all(ctx.owner);for(const taskId of dependencies){const task=await record(ctx,taskId,'tasks');if(d.status==='done'&&task.data.status!=='done')throw new Error('task_dependency_incomplete');const seen=new Set<string>();const visit=(current:string):boolean=>{if(current===id)return true;if(seen.has(current))return false;seen.add(current);return (records.find(r=>r.id===current)?.data.dependencies??[]).some((r:{taskId:string})=>visit(r.taskId));};if(visit(taskId))throw new Error('task_dependency_cycle');}}
 if(kind==='tasks'){if(d.status==='done')d.completedAt=prior?.data.completedAt??new Date().toISOString();else delete d.completedAt;}
 assertRecord(ctx,{id,kind,data:d},prior?'edit':'add');
 if(!prior){const existing=await db().prepare('SELECT kind,data FROM records WHERE owner=? AND id=?').bind(ctx.owner,id).first<{kind:string;data:string}>();if(existing){const old=JSON.parse(existing.data);delete old.actorId;if(kind==='tasks'&&d.status==='done')d.completedAt=old.completedAt;if(existing.kind!==kind||JSON.stringify(old)!==JSON.stringify(d))throw new Error('idempotency_conflict');return {id};}}
 const batch=prior?[guard(ctx,prior),update(ctx,prior,d)]:[insert(ctx,kind,d,id)];
 const recipients=assigned.filter(e=>!prior||!assignees(prior.data).includes(e.id)||['name','date','time','dueDate','endDate','endTime','hours','priority','location','status'].some(k=>prior.data[k]!==d[k]));
 for(const e of recipients){const member=await db().prepare("SELECT data FROM records WHERE owner=? AND kind='users' AND archived=0 AND json_extract(data,'$.status')='active' AND json_extract(data,'$.employeeId')=?").bind(ctx.owner,e.id).first<{data:string}>();const email=member?JSON.parse(member.data).email:e.data.email;if(!email)continue;const now=new Date().toISOString();batch.push(db().prepare('INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,?, ?,1,0,0,?,?)').bind(crypto.randomUUID(),ctx.owner,'notifications',JSON.stringify({name:'Agenda · '+d.name,recipientEmail:email.toLowerCase(),message:(d.date??d.dueDate)+' '+(d.time??'')+' · '+d.name,sourceId:id,status:'unread',priority:d.priority??'normal',actorId:ctx.actor}),now,now));}
 await db().batch(batch);return {id};
}
export async function agendaAction(ctx:Access,b:{action:string;id?:string;kind?:string;revision?:number;requestId?:string;data?:Entry['data'];date?:string}){
 if(b.action==='save')return saveAgenda(ctx,b);
 if(!b.id)throw new Error('invalid_reference');const e=await record(ctx,b.id,undefined,b.action!=='archive');if(e.revision!==b.revision)throw new Error('conflict');if(!calendarKinds.has(e.kind))throw new Error('invalid_module');
 if(!ctx.admin&&(!ctx.employeeId||!assignees(e.data).includes(ctx.employeeId)))throw new Error('forbidden_assignment');
 if(b.action==='completeTask'){if(e.kind!=='tasks'||['done','cancelled'].includes(e.data.status))throw new Error('invalid_status');return saveAgenda(ctx,{...b,kind:'tasks',data:{...e.data,status:'done'}});}
 if(b.action==='cancelOccurrence'){if(e.kind!=='agendaEvents'||!validDate(b.date)||!agendaItems([e],b.date,b.date).some(i=>i.date===b.date))throw new Error('invalid_occurrence');const dates=new Set(String(e.data.excludedDates??'').split(/\r?\n/).filter(Boolean));dates.add(b.date);return saveAgenda(ctx,{...b,kind:e.kind,data:{...e.data,excludedDates:[...dates].sort().join('\n')}});}
 if(b.action==='archive'){assertRecord(ctx,e,'delete');await db().batch([guard(ctx,e),db().prepare('UPDATE records SET archived=1,revision=revision+1,updated_at=? WHERE owner=? AND id=?').bind(new Date().toISOString(),ctx.owner,e.id)]);return {id:e.id};}
 throw new Error('invalid_action');
}
export {agendaICS};
