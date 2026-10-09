import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm} from 'node:fs/promises';
import path from 'node:path';
import {createClient} from '@libsql/client';
import migrations from '../lib/vercel/migrations.json' with {type:'json'};
import {tunisiaDemo,scopeTunisiaDemo,TUNISIA_DEMO_CUTOFF,TUNISIA_DEMO_ID} from '../lib/solar/tunisia-demo';
import {byKey} from '../lib/solar/modules';
import {validate} from '../lib/solar/domain';
import {dashboardReport} from '../lib/solar/enterprise-domain';
import {tejXML,validateTej} from '../lib/solar/fiscal';

const initial=tunisiaDemo(),demo=scopeTunisiaDemo(initial,'test-tunisia');
assert.deepEqual(initial,tunisiaDemo(),'fixed-seed generation');
assert.equal(new Set(demo.records.map(r=>r.id)).size,demo.records.length);
const records=new Map(demo.records.map(r=>[r.id,r]));
const ref=(value:string,target:string)=>assert.equal(records.get(value)?.kind,target,'reference '+value);
for(const r of demo.records) {
  assert.equal(r.demo,1);assert.equal(r.data.sampleDataset,TUNISIA_DEMO_ID);
  validate(r.kind,r.data);
  assert.ok(!r.data.date||r.data.date<=TUNISIA_DEMO_CUTOFF,'no future actual '+r.id);
  for(const f of byKey[r.kind].fields) {
    if(f.type==='link'&&r.data[f.key])ref(r.data[f.key],f.target!);
    if(f.type==='rows')for(const row of r.data[f.key]??[])for(const column of f.columns??[])if(column.type==='link'&&row[column.key])ref(row[column.key],column.target!);
  }
  for(const line of r.data.lines??[])if(line.productId)ref(line.productId,'products');
  if(r.kind==='journalEntries')assert.equal(r.data.debit,r.data.credit);
  if(r.kind==='messages')assert.ok(r.data.members.some((m:any)=>m.email===r.data.senderEmail));
  if(r.kind==='users')assert.equal(r.data.status,'inactive');
  if(r.kind==='withholdings')assert.ok(r.data.total<=records.get(r.data.paymentId)!.data.amount);
}
for(const invoice of demo.records.filter(r=>r.kind==='invoices'&&r.data.invoiceType==='invoice')){
  const dues=demo.records.filter(r=>r.kind==='installments'&&r.data.invoiceId===invoice.id).reduce((n,r)=>n+r.data.amount,0);
  const credits=demo.records.filter(r=>r.kind==='invoices'&&r.data.originalId===invoice.id).reduce((n,r)=>n+r.data.total,0);
  assert.equal(dues+credits,invoice.data.total,'invoice conservation');
}
const certificate=demo.records.find(r=>r.kind==='withholdings'&&r.data.direction==='issued')!;
await validateTej(tejXML(demo.company,certificate.data.date.slice(0,7),'0',[certificate.data]).xml);
await mkdir(path.resolve('.sites-runtime'),{recursive:true});
const directory=await mkdtemp(path.resolve('.sites-runtime/tunisia-test-'));
const client=createClient({url:'file:'+path.join(directory,'demo.db'),intMode:'number'});
try {
  for(const migration of migrations)await client.batch(migration.statements,'write');
  const insert=(r:any)=>({sql:'INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,?,?,1,1,0,?,?)',args:[r.id,'test-tunisia',r.kind,JSON.stringify(r.data),r.createdAt,r.updatedAt]});
  await client.batch(demo.records.map(insert),'write');
  const stock=(await client.execute('SELECT * FROM stock_balances')).rows as any[];
  const expected=new Map<string,number>();
  for(const r of demo.records.filter(r=>r.kind==='movements')){const key=r.data.productId+'|'+r.data.warehouse;expected.set(key,(expected.get(key)??0)+Math.round(r.data.quantity*1000)*(r.data.direction==='stockIn'?1:-1));}
  for(const row of stock){assert.equal(row.quantity,expected.get(row.product_id+'|'+row.warehouse));assert.ok(row.quantity>=0);}
  // A chronological replay also catches backdated deliveries against unavailable stock.
  const historical=new Map<string,number>();
  for(const r of demo.records.filter(r=>r.kind==='movements').sort((a,b)=>a.data.date.localeCompare(b.data.date))){const key=r.data.productId+'|'+r.data.warehouse;historical.set(key,(historical.get(key)??0)+r.data.quantity*(r.data.direction==='stockIn'?1:-1));assert.ok(historical.get(key)!>=0,'dated stock '+r.id);}
  const allocations=(await client.execute('SELECT * FROM allocations')).rows as any[];
  for(const due of demo.records.filter(r=>r.kind==='installments'))assert.ok(allocations.filter(a=>a.installment_id===due.id).reduce((n,a)=>n+a.amount,0)<=due.data.amount);
  assert.ok(demo.records.some(r=>r.kind==='payments'&&r.data.allocations?.length===2),'multi invoice payment');
  const serials=(await client.execute('SELECT * FROM serial_locations')).rows as any[];
  assert.equal(new Set(serials.map(s=>s.serial)).size,serials.length);
  for(const product of demo.records.filter(r=>r.kind==='products'&&r.data.tracking==='serialTracking'))for(const row of stock.filter(s=>s.product_id===product.id))assert.equal(serials.filter(s=>s.product_id===product.id&&s.warehouse===row.warehouse).length*1000,row.quantity);
  const workspace:any={records:demo.records,stock,allocations,serials,company:demo.company,events:[],files:[]};
  for(const [from,to] of [['2025-01-01','2025-12-31'],['2026-01-01',TUNISIA_DEMO_CUTOFF]]){const report=dashboardReport(workspace,{from,to});assert.ok(report.kpis.sales>0);assert.ok(report.kpis.incoming>0);assert.ok(report.kpis.overdue>0);assert.ok(report.kpis.stockValue>0);assert.ok(report.projectMargins.some(p=>p.margin>0));console.log(from.slice(0,4),JSON.stringify(report.kpis));}
  const count=(await client.execute('SELECT COUNT(*) n FROM records')).rows[0].n;
  await assert.rejects(client.batch([insert({...demo.records[0],id:'rolled-back-record'}),insert(demo.records[0])],'write'));
  assert.equal((await client.execute('SELECT COUNT(*) n FROM records')).rows[0].n,count,'rollback');
  // Exercise the actual Vercel adapter's bounded transaction path, including a
  // failure in a later chunk after earlier chunks have executed.
  process.env.TURSO_DATABASE_URL='file:'+path.join(directory,'adapter.db');
  process.env.TURSO_AUTH_TOKEN='';
  const {database,sqlClient}=await import('../lib/vercel/database');
  const adapter=database();
  const statement=(key:string)=>adapter.prepare('INSERT INTO records(id,owner,kind,data,revision,demo,archived,created_at,updated_at) VALUES(?,?,?, ?,1,1,0,?,?)').bind(key,'atomic-test','clients',JSON.stringify({name:'Simulation',notes:'x'.repeat(3000)}),'2025-01-01','2025-01-01');
  await statement('baseline').run();
  const bulk=Array.from({length:200},(_,i)=>statement('bulk-'+i));
  await assert.rejects(adapter.batch([...bulk,statement('baseline')]));
  assert.equal((await adapter.prepare('SELECT COUNT(*) n FROM records').first<{n:number}>())!.n,1,'all chunks rolled back');
  const results=await adapter.batch(bulk);assert.equal(results.length,200);
  assert.equal((await adapter.prepare('SELECT COUNT(*) n FROM records').first<{n:number}>())!.n,201);
  sqlClient().close();
  console.log('PASS: Tunisian history, typed/nested references, invoice/credit conservation, balanced journals, date cutoff, TEJ XSD, SQL migrations, stock/serial reconciliation, allocations and atomic rollback. Records:',demo.records.length);
} finally {client.close();await rm(directory,{recursive:true,force:true});}
