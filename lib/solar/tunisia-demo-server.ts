import {db, assertAdmin, type Access} from './server';
import {tunisiaDemo, scopeTunisiaDemo, TUNISIA_DEMO_ID} from './tunisia-demo';

export async function loadTunisiaDemo(ctx:Access) {
  assertAdmin(ctx);
  const marker=ctx.owner+'-'+TUNISIA_DEMO_ID;
  const loaded=await db().prepare('SELECT data FROM records WHERE id=? AND owner=?').bind(marker,ctx.owner).first<{data:string}>();
  if(loaded)return {ok:true,alreadyLoaded:true,...JSON.parse(loaded.data)};
  // Never mix fictional tax/accounting documents with an operational workspace.
  const real=await db().prepare('SELECT id FROM records WHERE owner=? AND demo=0 LIMIT 1').bind(ctx.owner).first();
  if(real)throw new Error('demo_requires_empty_workspace');
  const demo=scopeTunisiaDemo(tunisiaDemo(ctx.email),ctx.owner),now=new Date().toISOString();
  const batches:D1PreparedStatement[]=[];
  // The marker is an atomic lease. The NOT NULL guard also closes the race with
  // a real record being created between the preflight read and the transaction.
  batches.push(db().prepare("INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,'demoDataset',CASE WHEN EXISTS(SELECT 1 FROM records WHERE owner=? AND demo=0) THEN NULL ELSE ? END,1,1,0,?,?)").bind(marker,ctx.owner,ctx.owner,JSON.stringify(demo.metadata),now,now));
  // Ten records per statement stay below D1's 100-bound-parameter limit.
  for(let start=0;start<demo.records.length;start+=10) {
    const records=demo.records.slice(start,start+10);
    const sql='INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES '+records.map(()=>'(?,?,?,?,1,1,0,?,?)').join(',');
    batches.push(db().prepare(sql).bind(...records.flatMap(r=>[r.id,ctx.owner,r.kind,JSON.stringify(r.data),r.createdAt,r.updatedAt])));
  }
  batches.push(db().prepare('INSERT INTO company(owner,data) VALUES(?,?) ON CONFLICT(owner) DO NOTHING').bind(ctx.owner,JSON.stringify(demo.company)));
  // Records, journal entries, stock, serials, allocations and audit triggers all
  // commit together; a failed or concurrent load cannot leave a partial dataset.
  try {await db().batch(batches);}
  catch(error) {
    const winner=await db().prepare('SELECT data FROM records WHERE id=? AND owner=?').bind(marker,ctx.owner).first<{data:string}>();
    if(winner)return {ok:true,alreadyLoaded:true,...JSON.parse(winner.data)};
    const realNow=await db().prepare('SELECT id FROM records WHERE owner=? AND demo=0 LIMIT 1').bind(ctx.owner).first();
    if(realNow)throw new Error('demo_requires_empty_workspace');
    throw error;
  }
  return {ok:true,alreadyLoaded:false,...demo.metadata};
}
