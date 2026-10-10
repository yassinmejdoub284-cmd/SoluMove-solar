import {db,assertAdmin,type Access} from './server';
import {technicalExamples,TECHNICAL_EXAMPLES_ID} from './technical-examples';
export async function loadTechnicalExamples(ctx:Access){
 assertAdmin(ctx);
 const entries=technicalExamples(ctx.owner+'-'),now=new Date().toISOString();
 // Idempotent append: no operational records, stock movements, signatures or
 // approval evidence are created or overwritten, even on concurrent requests.
 const batch=entries.map(e=>db().prepare('INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,?,?,1,1,0,?,?) ON CONFLICT(id) DO NOTHING').bind(e.id,ctx.owner,e.kind,JSON.stringify(e.data),now,now));
 await db().batch(batch);
 const records=await db().prepare("SELECT id FROM records WHERE owner=? AND kind='technicalPlans' AND archived=0 AND json_extract(data,'$.sampleDataset')=? ORDER BY id").bind(ctx.owner,TECHNICAL_EXAMPLES_ID).all<{id:string}>();
 return {ok:true,ids:records.results.map(r=>r.id)};
}
