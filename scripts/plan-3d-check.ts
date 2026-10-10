import assert from 'node:assert/strict';
import {technicalExamples,TECHNICAL_EXAMPLES_ID} from '../lib/solar/technical-examples';
import {planModel,planOBJ,planMTL,projectPoint,defaultPlanCamera} from '../lib/solar/plan-3d';
import {technicalDXF,technicalDesign} from '../lib/solar/technical-domain';
import {recordRelations} from '../lib/solar/technical-domain';
import type {Entry} from '../lib/solar/domain';
const entries=technicalExamples('owner-'),ids=new Set(entries.map(e=>e.id)),plans=entries.filter(e=>e.kind==='technicalPlans');
assert.equal(plans.length,3);assert.equal(entries.filter(e=>e.kind==='clients').length,3);assert.equal(new Set(entries.map(e=>e.id)).size,entries.length);
assert.deepEqual(entries,technicalExamples('owner-'));
for(const e of entries){assert.equal(e.demo,1);assert.equal(e.data.sampleDataset,TECHNICAL_EXAMPLES_ID);assert.notEqual(e.data.status,'approved');assert.ok(!e.data.approvalFileId);for(const key of ['clientId','projectId','siteId','dossierId','agencyId'])if(e.data[key])assert.ok(ids.has(e.data[key]));}
for(const plan of plans){
 const model=planModel(plan),snapshot=plan.data.studySnapshot;
 assert.equal(model.assumedHeight,false);assert.equal(model.assumedClearance,false);
 const panels=model.meshes.filter(m=>m.layer==='panels');assert.equal(panels.length,snapshot.count);
 const first=panels[0],a=first.vertices[4],b=first.vertices[7];assert.ok(Math.abs(Math.hypot(b.y-a.y,b.z-a.z)-plan.data.moduleLength)<1e-9);assert.equal(first.vertices[0].z,plan.data.roofHeight+plan.data.panelClearance);
 assert.equal(model.meshes.filter(m=>m.id.startsWith('anchor-')).length,snapshot.anchors);
 assert.deepEqual(model.wires[0].points,snapshot.routes[0].points);
 const obj=planOBJ(plan),vertices=obj.split('\n').filter(l=>l.startsWith('v '));assert.equal(vertices.length,model.meshes.reduce((n,m)=>n+m.vertices.length,0)+model.wires.reduce((n,w)=>n+w.points.length,0));
 for(const line of obj.split('\n').filter(l=>/^[fl] /.test(l)))for(const index of line.slice(2).split(' ').map(Number))assert.ok(Number.isInteger(index)&&index>=1&&index<=vertices.length);
 assert.match(obj,/metres \| Z-up/);assert.match(obj,/mtllib solar-plan.mtl/);assert.match(planMTL(),/newmtl dc/);assert.match(technicalDXF(plan),/\nDC\n/);
 for(const mesh of model.meshes)for(const p of mesh.vertices){const screen=projectPoint(p,model,defaultPlanCamera);assert.ok([screen.x,screen.y,screen.depth].every(Number.isFinite));assert.ok(screen.x>=39&&screen.x<=761&&screen.y>=39&&screen.y<=481);}
 assert.ok(recordRelations(entries.find(e=>e.id===plan.data.clientId)!,entries).some(e=>e.id===plan.id));
 assert.throws(()=>technicalDesign({...plan.data,roofHeight:-1}),/roofHeight/);
}
const old={...plans[0],data:{...plans[0].data,roofHeight:undefined,panelClearance:undefined,studySnapshot:{...plans[0].data.studySnapshot,roofHeight:undefined,panelClearance:undefined}}} as Entry;
assert.equal(planModel(old).assumedHeight,true);assert.equal(planModel(old).assumedClearance,true);
assert.throws(()=>planModel({...plans[0],data:{}}),/plan_not_generated/);
console.log('PASS: three deterministic linked Tunisian examples, actual tilted 3D module dimensions, elevations/anchors/cable Z, OBJ indices/materials, DXF, client context and legacy-height warnings.');
