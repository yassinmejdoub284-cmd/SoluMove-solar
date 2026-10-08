import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {headers} from 'next/headers';
import type {Entry} from './domain';
export type Access={owner:string;actor:string;email:string;admin:boolean;branches:string[];rules:{module:string,access:string}[]};
export async function access():Promise<Access>{
 const user=await getChatGPTUser();if(!user)throw new Error('unauthorized');
 const requested=(await headers()).get('x-solar-workspace');
 const memberships=await db().prepare("SELECT owner,data FROM records WHERE kind='users' AND archived=0 AND json_extract(data,'$.status')='active' AND lower(json_extract(data,'$.email'))=?").bind(user.email.toLowerCase()).all<{owner:string,data:string}>();
 let owner=requested??user.userId;
 if(!requested){const own=await db().prepare('SELECT id FROM records WHERE owner=? LIMIT 1').bind(owner).first();if(!own&&memberships.results.length===1)owner=memberships.results[0].owner;else if(!own&&memberships.results.length>1)throw new Error('select_workspace');}
 if(owner===user.userId)return {owner,actor:user.userId,email:user.email,admin:true,branches:[],rules:[]};
 const member=memberships.results.find(m=>m.owner===owner);if(!member)throw new Error('forbidden');const data=JSON.parse(member.data);
 const role=await db().prepare("SELECT data FROM records WHERE id=? AND owner=? AND kind='roles' AND archived=0 AND json_extract(data,'$.status')='active'").bind(data.roleId,owner).first<{data:string}>();if(!role)throw new Error('forbidden');
 return {owner,actor:user.userId,email:user.email,admin:false,branches:(data.branches??[]).map((r:any)=>r.agencyId),rules:JSON.parse(role.data).rules??[]};
}
export async function identity(){return (await access()).owner;}
export function can(a:Access,module:string,write=false){return a.admin||(!['roles','users'].includes(module)&&a.rules.some(r=>r.module===module&&(!write||r.access==='write')));}
export function assertModule(a:Access,module:string,write=false){if(!can(a,module,write))throw new Error('forbidden');}
const shared=new Set(['clients','products','suppliers','accounts','journals','payrollPolicies','contractTemplates','bankProfiles']);
export function visible(a:Access,e:Pick<Entry,'id'|'kind'|'data'>){if(!can(a,e.kind))return false;if(a.admin||shared.has(e.kind))return true;if(e.kind==='transits')return a.branches.includes(e.data.agencyId)||a.branches.includes(e.data.destinationAgencyId);return a.branches.includes(e.kind==='agencies'?e.id:e.data.agencyId);}
export function assertRecord(a:Access,e:Pick<Entry,'id'|'kind'|'data'>,write=false){assertModule(a,e.kind,write);if(!visible(a,e))throw new Error('forbidden_branch');}
export function assertAdmin(a:Access){if(!a.admin)throw new Error('forbidden');}
export function db():D1Database{if(!env.DB)throw new Error('storage_unavailable');return env.DB;}
export function failure(error:unknown){const s=error instanceof Error?error.message:'server_error';console.error('solar request failure',s);const code=['overpayment','insufficient_stock','insufficient_available_stock','invalid_allocation','serial_location','serial_count','vehicle_overlap','conflict','period_closed','unbalanced_entry','invalid_journal_line','overreceipt','insufficient_leave'].find(c=>s.includes(c))??(s.startsWith('D1_ERROR')?'operation_rejected':s);return Response.json({error:code},{status:code==='unauthorized'?401:code.startsWith('forbidden')?403:code==='storage_unavailable'?503:400});}
