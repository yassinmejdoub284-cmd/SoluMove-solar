import {allows,inScope,type PermissionRule,type PermissionAction} from './permissions';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {headers} from 'next/headers';
import type {Entry} from './domain';
export type Access={owner:string;actor:string;email:string;admin:boolean;branches:string[];warehouses?:string[];employeeId?:string;rules:PermissionRule[]};
export async function access():Promise<Access>{
 const user=await getChatGPTUser();if(!user)throw new Error('unauthorized');
 const requested=(await headers()).get('x-solar-workspace');
 const memberships=await db().prepare("SELECT owner,data FROM records WHERE kind='users' AND archived=0 AND json_extract(data,'$.status')='active' AND lower(json_extract(data,'$.email'))=?").bind(user.email.toLowerCase()).all<{owner:string,data:string}>();
 const vercel=process.env.SOLAR_VERCEL_BUILD==='1';
 const isOwner=!vercel||user.email.toLowerCase()===(process.env.SOLAR_OWNER_EMAIL??'').trim().toLowerCase();
 if(!isOwner&&!memberships.results.length)throw new Error('forbidden');
 let owner=requested??(isOwner?user.userId:memberships.results.length===1?memberships.results[0].owner:'');
 if(!owner)throw new Error('select_workspace');
 if(!requested){const own=await db().prepare('SELECT id FROM records WHERE owner=? LIMIT 1').bind(owner).first();if(!own&&memberships.results.length===1)owner=memberships.results[0].owner;else if(!own&&memberships.results.length>1)throw new Error('select_workspace');}
 if(owner===user.userId&&isOwner)return {owner,actor:user.userId,email:user.email,admin:true,branches:[],rules:[]};
 const member=memberships.results.find(m=>m.owner===owner);if(!member)throw new Error('forbidden');const data=JSON.parse(member.data);
 const role=await db().prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='roles' AND archived=0 AND json_extract(data,'$.status')='active'").bind(data.roleId,owner).first<{data:string}>();if(!role)throw new Error('forbidden');
 return {owner,actor:user.userId,email:user.email,admin:false,employeeId:data.employeeId,branches:(data.branches??[]).map((r:any)=>r.agencyId),warehouses:(data.warehouses??[]).map((r:any)=>r.warehouseId),rules:JSON.parse(role.data).rules??[]};
}
export async function identity(){return (await access()).owner;}
export function can(a:Access,module:string,action:PermissionAction=false){return allows(a,module,action);}
export function assertModule(a:Access,module:string,action:PermissionAction=false){if(!can(a,module,action))throw new Error('forbidden');}
export function visible(a:Access,e:Pick<Entry,'id'|'kind'|'data'>){return inScope(a,e);}
export function assertRecord(a:Access,e:Pick<Entry,'id'|'kind'|'data'>,action:PermissionAction=false){assertModule(a,e.kind,action);if(!visible(a,e))throw new Error('forbidden_branch');}
export function assertAdmin(a:Access){if(!a.admin)throw new Error('forbidden');}
export function assertOrigin(request:Request){const origin=request.headers.get('origin');const trusted=process.env.SOLAR_VERCEL_BUILD==='1'&&process.env.BETTER_AUTH_URL?process.env.BETTER_AUTH_URL:request.url;if(origin&&origin!==new URL(trusted).origin)throw new Error('invalid_origin');}
export function db():D1Database{if(!env.DB)throw new Error('storage_unavailable');return env.DB;}
export function failure(error:unknown){const s=error instanceof Error?error.message:'server_error';console.error('solar request failure',s);const code=['overpayment','insufficient_stock','insufficient_available_stock','invalid_allocation','serial_location','serial_count','vehicle_overlap','conflict','period_closed','unbalanced_entry','invalid_journal_line','overreceipt','insufficient_leave','overdelivery','overtransfer','credit_exceeds_invoice','retention_exceeds_payment'].find(c=>s.includes(c))??(s.startsWith('D1_ERROR')?'operation_rejected':s);return Response.json({error:code},{status:code==='unauthorized'?401:code.startsWith('forbidden')?403:code==='storage_unavailable'?503:400});}
