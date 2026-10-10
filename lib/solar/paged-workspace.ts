import {db,can,visible,type Access} from './server';
import {byKey} from './modules';
import type {Entry} from './domain';

const decode=(r:any):Entry=>({id:r.id,kind:r.kind,data:JSON.parse(r.data),revision:r.revision,demo:r.demo,archived:r.archived,createdAt:r.created_at,updatedAt:r.updated_at});
// Keep complete histories in the client, while each function response stays small.
export async function pagedWorkspace(ctx:Access,page:number) {
  if(!Number.isSafeInteger(page)||page<0||page>1000)throw new Error('invalid_page');
  const owner=ctx.owner,size=200;
  const [version,rows]=await db().batch([
    db().prepare('SELECT COUNT(*) n,COALESCE(SUM(revision),0) revisions,COALESCE(MAX(updated_at),\'\') stamp FROM records WHERE owner=?').bind(owner),
    db().prepare('SELECT * FROM records WHERE owner=? AND archived=0 ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?').bind(owner,size+1,page*size),
  ]);
  const v:any=version.results[0];
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${v.n}:${v.revisions}:${v.stamp}`));
  const pagination={page,hasMore:rows.results.length>size,version:[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  const records=rows.results.slice(0,size).map(decode).filter(r=>visible(ctx,r));
  if(page>0)return {records,pagination};
  const [related,al,st,ev,co,fi,se]=await Promise.all([
    // Ancillary ledgers need visibility of their parents across ALL pages, not
    // only the current page. Fetch just the permission fields for those parents.
    db().prepare("SELECT id,kind,json_object('employeeId',json_extract(data,'$.employeeId'),'participants',json_extract(data,'$.participants'),'agencyId',json_extract(data,'$.agencyId'),'destinationAgencyId',json_extract(data,'$.destinationAgencyId'),'warehouse',json_extract(data,'$.warehouse'),'from',json_extract(data,'$.from'),'to',json_extract(data,'$.to'),'recipientEmail',json_extract(data,'$.recipientEmail'),'members',json_extract(data,'$.members')) data FROM records WHERE owner=? AND archived=0 AND (kind IN ('products','warehouses','installments','payments','projects') OR id IN (SELECT record_id FROM files WHERE owner=?) OR id IN (SELECT record_id FROM events WHERE owner=? ORDER BY created_at DESC LIMIT 100))").bind(owner,owner,owner).all(),
    db().prepare('SELECT * FROM allocations WHERE owner=?').bind(owner).all(),
    db().prepare('SELECT * FROM stock_balances WHERE owner=?').bind(owner).all(),
    db().prepare('SELECT * FROM events WHERE owner=? ORDER BY created_at DESC LIMIT 100').bind(owner).all(),
    db().prepare('SELECT data FROM company WHERE owner=?').bind(owner).first<{data:string}>(),
    db().prepare('SELECT * FROM files WHERE owner=? ORDER BY created_at DESC').bind(owner).all(),
    db().prepare('SELECT * FROM serial_locations WHERE owner=?').bind(owner).all(),
  ]);
  const ids=new Set(related.results.filter((r:any)=>visible(ctx,{id:r.id,kind:r.kind,data:JSON.parse(r.data)})).map((r:any)=>r.id));
  return {generatedAt:new Date().toISOString(),pagination,records,
    access:{actor:ctx.actor,owner,admin:ctx.admin,employeeId:ctx.employeeId,branches:ctx.branches,read:Object.keys(byKey).filter(k=>can(ctx,k)),write:Object.keys(byKey).filter(k=>can(ctx,k,'edit')),add:Object.keys(byKey).filter(k=>can(ctx,k,'add')),delete:Object.keys(byKey).filter(k=>can(ctx,k,'delete')),warehouses:ctx.warehouses??[]},
    allocations:al.results.filter((r:any)=>ids.has(r.payment_id)&&ids.has(r.installment_id)),stock:st.results.filter((r:any)=>ids.has(r.product_id)&&ids.has(r.warehouse)),events:ctx.admin?ev.results:ev.results.filter((r:any)=>ids.has(r.record_id)),company:co?JSON.parse(co.data):{},files:fi.results.filter((r:any)=>ids.has(r.record_id)),serials:se.results.filter((r:any)=>ids.has(r.product_id)&&(ids.has(r.warehouse)||ids.has(r.project_id)))};
}
