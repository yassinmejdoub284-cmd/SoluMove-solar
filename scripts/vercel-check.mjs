import {checkTechnical} from './technical-api-check.mjs';
import {checkEnterprise} from './enterprise-api-check.mjs';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
const folder=await mkdtemp(path.resolve('.sites-runtime/vercel-test-'));
const origin='http://127.0.0.1:4329',key=randomBytes(32).toString('hex'),password=randomBytes(24).toString('hex');
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4329'],{
 env:{...process.env,TURSO_DATABASE_URL:`file:${folder}/test.db`,TURSO_AUTH_TOKEN:'',BETTER_AUTH_SECRET:key,BETTER_AUTH_URL:origin,SOLAR_OWNER_EMAIL:'owner@example.com',NEXT_TELEMETRY_DISABLED:'1',STEG_GATEWAY_URL:'https://steg-test.example/account-status',STEG_GATEWAY_HOST:'steg-test.example',STEG_GATEWAY_TOKEN:key,NODE_OPTIONS:((process.env.NODE_OPTIONS??'')+' --require '+path.resolve('scripts/steg-test-provider.cjs')).trim()},stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',c=>{log+=c});server.stderr.on('data',c=>{log+=c});
let cookie='';
async function request(route,body,auth=cookie,extra={}){
 const r=await fetch(origin+route,{method:body?'POST':'GET',redirect:'manual',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(auth?{Cookie:auth}:{}),...extra},...(body?{body:JSON.stringify(body)}:{})});
 const raw=await r.text();let data;try{data=JSON.parse(raw)}catch{data=raw}return {r,data};
}
const ok=({r,data})=>{assert.equal(r.status,200,JSON.stringify(data));return data};
const workspace=body=>request('/api/workspace',body);
async function save(kind,data){return ok(await workspace({action:'save',kind,data,requestId:crypto.randomUUID()})).id;}
try{
 await new Promise((resolve,reject)=>{const deadline=setTimeout(()=>reject(new Error('Next startup timed out: '+log.slice(-1200))),20000);server.stdout.on('data',()=>{if(log.includes('Ready')){clearTimeout(deadline);resolve()}});server.on('exit',code=>{clearTimeout(deadline);reject(new Error(`Next exited ${code}: ${log}`))})});
 let v=await request('/');assert.equal(v.r.status,307);assert.match(v.r.headers.get('location'),/sign-in/);
 v=await request('/sign-in');assert.equal(v.r.status,200);assert.match(v.data,/Activer votre espace/);
 for(const route of ['/api/workspace','/api/business','/api/files','/api/invitations','/api/technical','/api/steg-connectors']){v=await request(route,['/api/invitations','/api/steg-connectors'].includes(route)?{}:undefined,'',{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com'});assert.equal(v.r.status,401);}
 v=await request('/api/auth/sign-up/email',{email:'owner@example.com',password,name:'Attacker'});assert.equal(v.r.status,404);
 v=await request('/api/activation',{email:'owner@example.com',key:'wrong',password});assert.equal(v.r.status,400);
 ok(await request('/api/activation',{email:'owner@example.com',key,password,name:'Test Owner'}));
 v=await request('/api/activation',{email:'owner@example.com',key,password});assert.equal(v.r.status,400);assert.equal(v.data.error,'already_activated');
 const signed=await request('/api/auth/sign-in/email',{email:'owner@example.com',password});ok(signed);
 cookie=signed.r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookie);
 v=await request('/');assert.equal(v.r.status,200);assert.match(v.data,/SoluMove/);
 let d=ok(await workspace());assert.equal(d.access.admin,true);assert.equal(d.records.length,0);const owner=d.access.owner;
 ok(await request('/api/auth/ok'));ok(await workspace({action:'demo'}));d=ok(await workspace());assert.ok(d.records.length>=30);
 const prefix=owner+'-',inst=prefix+'demo-installment-1';
 await save('payments',{name:'Test partial',direction:'incoming',clientId:prefix+'demo-client-1',installmentId:inst,date:'2026-10-09',amount:2000000,method:'transfer',status:'cleared'});
 v=await workspace({action:'save',kind:'payments',data:{name:'Rejected payment',direction:'incoming',clientId:prefix+'demo-client-1',installmentId:inst,date:'2026-10-09',amount:1,method:'transfer',status:'cleared'}});assert.equal(v.r.status,400);assert.equal(v.data.error,'overpayment');
 d=ok(await workspace());assert.ok(!d.records.some(r=>r.data.name==='Rejected payment'));assert.equal(d.allocations.filter(a=>a.installment_id===inst).reduce((s,a)=>s+a.amount,0),5000000);
 const product=prefix+'demo-product-1',from=prefix+'demo-warehouse-1',to=prefix+'demo-warehouse-2';
 const balances=d.stock.filter(s=>s.product_id===product);
 v=await workspace({action:'transfer',productId:product,from,to,quantity:100000,reason:'Must roll back',requestId:crypto.randomUUID()});assert.equal(v.r.status,400);
 d=ok(await workspace());assert.deepEqual(d.stock.filter(s=>s.product_id===product),balances);
 ok(await workspace({action:'transfer',productId:product,from,to,quantity:1,reason:'Real atomic transfer',requestId:crypto.randomUUID()}));
 ok(await request('/api/business',{action:'setupAccounting'}));
 const role=await save('roles',{name:'Staff read only',rules:[{module:'invoices',access:'read'},{module:'clients',access:'read'}],status:'active'});
 const staffId=await save('users',{name:'Staff',email:'staff@example.com',roleId:role,branches:[{agencyId:prefix+'demo-agency-1'}],status:'active'});
 const invitation=ok(await request('/api/invitations',{recordId:staffId}));const token=new URL(invitation.url).hash.slice('#invite='.length);
 ok(await request('/api/activation',{action:'invite',token,password,name:'Staff'}));
 const staffLogin=await request('/api/auth/sign-in/email',{email:'staff@example.com',password});ok(staffLogin);
 const staffCookie=staffLogin.r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
 const staff=ok(await request('/api/workspace',undefined,staffCookie));assert.equal(staff.access.admin,false);assert.equal(staff.access.owner,owner);assert.ok(staff.records.every(r=>['invoices','clients'].includes(r.kind)));
 v=await request('/api/workspace',{action:'company',data:{name:'Forbidden'}},staffCookie);assert.equal(v.r.status,403);
 v=await request('/api/invitations',{recordId:staffId},staffCookie);assert.equal(v.r.status,403);
 await checkEnterprise({request,workspace,save,ok,cookie,staffCookie,owner,prefix,role,staffId});
 await checkTechnical({request,workspace,save,ok,staffCookie,owner,prefix,folder});
 v=await request('/api/activation',{action:'invite',token,password});assert.equal(v.r.status,400);assert.equal(v.data.error,'invalid_invitation');
 v=await request('/api/activation',{key:'wrong'});assert.equal(v.r.status,429);
 v=await request('/api/auth/sign-out',{},cookie,{Origin:'https://evil.example'});assert.equal(v.r.status,403);
 ok(await request('/api/auth/sign-out',{}));v=await workspace();assert.equal(v.r.status,401);
 console.log('PASS: Next production + real libSQL migrations, guarded owner activation, signed sessions, forged identity rejection, closed signup, payments/stock rollback, accounting, invitations, staff permissions, CSRF and session revocation.');
}catch(e){console.error(log.slice(-5000));throw e;}
finally{if(server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}await rm(folder,{recursive:true,force:true});}
