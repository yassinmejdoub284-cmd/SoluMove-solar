import type {Entry} from './domain';
export type PermissionRule={module:string;access:string;add?:string;edit?:string;delete?:string;scope?:string};
export type PermissionContext={admin:boolean;email:string;actor:string;branches:string[];warehouses?:string[];rules:PermissionRule[]};
export type PermissionAction='read'|'add'|'edit'|'delete'|boolean;
export function allows(ctx:PermissionContext,module:string,action:PermissionAction=false){
 if(ctx.admin)return true;
 if(['roles','users'].includes(module))return false;
 const verb=action===true?'edit':action===false?'read':action;
 return ctx.rules.some(r=>r.module===module&&(verb==='read'||(r[verb]===undefined?r.access==='write':r[verb]==='allow')));
}
const globalCatalog=new Set(['products','suppliers','accounts','journals','payrollPolicies','contractTemplates','bankProfiles','accountingSettings']);
export function inScope(ctx:PermissionContext,e:Pick<Entry,'id'|'kind'|'data'>){
 if(!allows(ctx,e.kind))return false;
 if(e.kind==='notifications')return e.data.recipientEmail?.toLowerCase()===ctx.email.toLowerCase();
 if(['conversations','messages'].includes(e.kind))return (e.data.members??[]).some((r:any)=>r.email?.toLowerCase()===ctx.email.toLowerCase());
 if(ctx.admin)return true;
 const matching=ctx.rules.filter(r=>r.module===e.kind);
 return matching.some(rule=>{
  const scope=rule.scope??'legacy';if(scope==='all')return true;
  if(globalCatalog.has(e.kind))return true;
  if(scope==='legacy'&&e.kind==='clients'&&!e.data.agencyId)return true;
  const agencyIds=[e.data.agencyId,e.data.destinationAgencyId,e.kind==='agencies'?e.id:undefined].filter(Boolean);
  const warehouseIds=[e.data.warehouse,e.data.from,e.data.to,e.kind==='warehouses'?e.id:undefined].filter(Boolean);
  const agencies=agencyIds.some(id=>ctx.branches.includes(id));
  const warehouses=warehouseIds.some(id=>ctx.warehouses?.includes(id));
  return scope==='warehouses'?warehouses:scope==='both'?agencies||warehouses:agencies;
 });
}
