import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),wr=createRequire(require.resolve('wrangler'));
const {Miniflare}=wr('miniflare');
const root=path.resolve('dist/server');
async function jsFiles(folder){let result=[];for(const e of await fs.readdir(folder,{withFileTypes:true})){const p=path.join(folder,e.name);if(e.isDirectory())result.push(...await jsFiles(p));else if(/\.(js|mjs)$/.test(e.name))result.push(p);}return result;}
const js=await jsFiles(root);js.sort((a,b)=>a===path.join(root,'index.js')?-1:b===path.join(root,'index.js')?1:0);
const mf=new Miniflare({modules:js.map(p=>({type:'ESModule',path:p})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:['DB'],r2Buckets:['BUCKET'],assets:{directory:path.resolve('dist/client'),binding:'ASSETS',routerConfig:{has_user_worker:true,invoke_user_worker_ahead_of_assets:true}},cf:false});
try{
 const db=await mf.getD1Database('DB');
 for(const file of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  const source=await fs.readFile(path.join('drizzle',file),'utf8');
  for(const statement of source.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(statement).run();
 }
 const owner='solar-test';
 async function call(body,who=owner){const response=await mf.dispatchFetch('https://solar.local/api/workspace',{method:body?'POST':'GET',headers:{...(who?{'oai-authenticated-user-id':who,'oai-authenticated-user-email':'test@example.com'}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const raw=await response.text();let json;try{json=JSON.parse(raw)}catch{throw new Error('Non-JSON API response '+response.status+' location='+response.headers.get('location')+' body='+raw.slice(0,500))}return [response.status,json];}
 async function save(kind,data){const [code,result]=await call({action:'save',kind,data,requestId:crypto.randomUUID()});assert.equal(code,200,JSON.stringify(result));return result.id;}
 let [code,d]=await call();assert.equal(code,200,JSON.stringify(d));
 [code,d]=await call({action:'demo'});assert.equal(code,200,JSON.stringify(d));
 [,d]=await call();assert.ok(d.records.length>=30);
 const prefix=owner+'-',inst=prefix+'demo-installment-1';
 const before=d.allocations.filter(a=>a.installment_id===inst).reduce((n,a)=>n+a.amount,0);assert.equal(before,3000000);
 const payment=await save('payments',{name:'Integration partial payment',direction:'incoming',clientId:prefix+'demo-client-1',installmentId:inst,date:'2026-10-08',amount:2000000,method:'transfer',status:'cleared'});
 [code,d]=await call({action:'save',kind:'payments',requestId:crypto.randomUUID(),data:{name:'Overpayment rejected',direction:'incoming',clientId:prefix+'demo-client-1',installmentId:inst,date:'2026-10-08',amount:1,method:'transfer',status:'cleared'}});assert.equal(code,400);assert.equal(d.error,'overpayment');
 [,d]=await call();assert.equal(d.allocations.filter(a=>a.installment_id===inst).reduce((n,a)=>n+a.amount,0),5000000);assert.ok(!d.records.some(e=>e.data.name==='Overpayment rejected'));
 const p=d.records.find(e=>e.id===payment);[code,d]=await call({action:'cancelPayment',id:payment,revision:p.revision,reason:'Integration test reversal'});assert.equal(code,200);
 [,d]=await call();assert.equal(d.allocations.filter(a=>a.installment_id===inst).reduce((n,a)=>n+a.amount,0),3000000);
 const product=prefix+'demo-product-1',from=prefix+'demo-warehouse-1',to=prefix+'demo-warehouse-2';
 const balance=d=>Object.fromEntries(d.stock.filter(s=>s.product_id===product).map(s=>[s.warehouse,s.quantity]));const b=balance(d);
 [code,d]=await call({action:'transfer',productId:product,from,to,quantity:10000,reason:'Must fail',requestId:crypto.randomUUID()});assert.equal(code,400);[,d]=await call();assert.deepEqual(balance(d),b);
 const transfer={action:'transfer',productId:product,from,to,quantity:1,reason:'Integration transfer',requestId:crypto.randomUUID()};[code,d]=await call(transfer);assert.equal(code,200,JSON.stringify(d));[code,d]=await call(transfer);assert.equal(code,200);[code,d]=await call({...transfer,quantity:2});assert.equal(code,400);assert.equal(d.error,'conflict');[,d]=await call();assert.equal(balance(d)[from],b[from]-1000);assert.equal(balance(d)[to],1000);
 [,d]=await call(undefined,'solar-other');assert.equal(d.records.length,0);[code,d]=await call(undefined,'');assert.equal(code,401);
 const quote=await save('quotes',{name:'Integration quote',clientId:prefix+'demo-client-1',agencyId:prefix+'demo-agency-1',date:'2026-10-08',status:'accepted',lines:[{description:'Installation test',quantity:1,price:1000000,tax:19}],stamp:1000});
 [code,d]=await call({action:'convert',id:quote});assert.equal(code,200);const invoice=d.id;[,d]=await call();const inv=d.records.find(e=>e.id===invoice);
 [code,d]=await call({action:'save',kind:'invoices',id:invoice,revision:inv.revision,data:{...inv.data,status:'issued'}});assert.equal(code,200,JSON.stringify(d));
 [code,d]=await call({action:'schedule',id:invoice,deposit:100000,count:3,firstDate:'2026-01-31',method:'transfer'});assert.equal(code,200,JSON.stringify(d));
 [,d]=await call();const parts=d.records.filter(e=>e.kind==='installments'&&e.data.invoiceId===invoice);assert.equal(parts.reduce((n,e)=>n+e.data.amount,0),1191000);assert.ok(parts.every(e=>e.data.agencyId===prefix+'demo-agency-1'));assert.ok(parts.some(e=>e.data.dueDate==='2026-02-28'));
 [code,d]=await call({action:'schedule',id:invoice,deposit:0,count:3,firstDate:'2026-01-31'});assert.equal(code,400);assert.equal(d.error,'schedule_exists');
 const res=await save('reservations',{name:'Integration reservation',productId:product,warehouse:from,quantity:1,date:'2026-10-08',status:'reserved'});[,d]=await call();const physical=d.stock.find(s=>s.product_id===product&&s.warehouse===from).quantity/1000;
 [code,d]=await call({action:'transfer',productId:product,from,to,quantity:physical,reason:'Reservation protection',requestId:crypto.randomUUID()});assert.equal(code,400);assert.equal(d.error,'insufficient_available_stock');
 const serialProduct=await save('products',{name:'Serial inverter',sku:'SERIAL-TEST',category:'inverter',tracking:'serialTracking',unit:'piece',purchasePrice:100000,salePrice:150000,status:'active'});
 const movement=await save('movements',{name:'Serial receipt',productId:serialProduct,warehouse:from,direction:'stockIn',quantity:1,serials:'TEST-SERIAL-001',date:'2026-10-08',reason:'Receipt',status:'posted'});
 [code,d]=await call({action:'save',kind:'movements',data:{name:'Duplicate serial receipt',productId:serialProduct,warehouse:from,direction:'stockIn',quantity:1,serials:'TEST-SERIAL-001',date:'2026-10-08',reason:'Duplicate',status:'posted'}});assert.equal(code,400);assert.equal(d.error,'serial_location');
 [code,d]=await call({action:'transfer',productId:serialProduct,from,to,quantity:1,serials:'TEST-SERIAL-001',reason:'Serial transfer',requestId:crypto.randomUUID()});assert.equal(code,200,JSON.stringify(d));[,d]=await call();assert.equal(d.serials.find(s=>s.serial==='TEST-SERIAL-001').warehouse,to);
 const mission={name:'Vehicle test mission',vehicleId:prefix+'demo-vehicle-1',employeeId:prefix+'demo-employee-1',date:'2026-10-09',time:'08:00',returnTime:'12:00',destination:'Test',startKm:24500,endKm:24600,status:'confirmed'};
 const missionId=await save('missions',mission);[code,d]=await call({action:'save',kind:'missions',data:{...mission,name:'Overlapping mission',time:'09:00',returnTime:'10:00'}});assert.equal(code,400);assert.equal(d.error,'vehicle_overlap');
 [,d]=await call();const missionEntry=d.records.find(e=>e.id===missionId);[code,d]=await call({action:'save',kind:'missions',id:missionId,revision:missionEntry.revision,data:{...mission,status:'completed'}});assert.equal(code,200);[,d]=await call();assert.equal(d.records.find(e=>e.id===prefix+'demo-vehicle-1').data.odometer,24600);
 const client=d.records.find(e=>e.id===prefix+'demo-client-1');[code,d]=await call({action:'save',kind:'clients',id:client.id,revision:client.revision,data:{...client.data,notes:'First update'}});assert.equal(code,200);
 [code,d]=await call({action:'save',kind:'clients',id:client.id,revision:client.revision,data:{...client.data,notes:'Stale update'}});assert.equal(code,400);assert.equal(d.error,'conflict');
 const rendered=await mf.dispatchFetch('https://solar.local/',{headers:{'oai-authenticated-user-id':owner,'oai-authenticated-user-email':'test@example.com'}});assert.equal(rendered.status,200);const html=await rendered.text();assert.ok(html.includes('SoluMove'));assert.ok(html.includes('Vue d’ensemble')||html.includes('Vue d&#x27;ensemble')||html.includes('workspace'));assert.ok(!html.includes('Your site is taking shape'));
 console.log('PASS: built Worker/API authentication, isolation, settlements, rollback/reversal, atomic/idempotent transfers, reservations, serial transfers, invoice conversion, branch-linked schedule conservation, vehicle overlap/odometer, stale edits and server-rendered app shell.');
}finally{await mf.dispose()}
