import {spawn} from 'node:child_process';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';

await mkdir(path.resolve('.sites-runtime'),{recursive:true});
async function scenario(realData=false){
  const folder=await mkdtemp(path.resolve('.sites-runtime/tunisia-api-'));
  const origin='http://127.0.0.1:4338',secret=randomBytes(32).toString('hex'),password=randomBytes(24).toString('hex');
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','4338'],{env:{...process.env,TURSO_DATABASE_URL:`file:${folder}/test.db`,TURSO_AUTH_TOKEN:'',BETTER_AUTH_SECRET:secret,BETTER_AUTH_URL:origin,SOLAR_OWNER_EMAIL:'owner@example.com',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
  let log='',cookie='';server.stdout.on('data',c=>{log+=c});server.stderr.on('data',c=>{log+=c});
  async function request(route,body,authenticated=true){
    const r=await fetch(origin+route,{method:body?'POST':'GET',headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(authenticated&&cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
    const raw=await r.text();return {r,data:JSON.parse(raw),bytes:Buffer.byteLength(raw)};
  }
  const ok=({r,data})=>{assert.equal(r.status,200,JSON.stringify(data));return data;};
  async function state(){
    for(let attempt=0;attempt<2;attempt++){
      const first=await request('/api/workspace?page=0');assert.ok(first.bytes<3400000,'bounded first response');const data=ok(first),records=[...data.records];let cursor=data.pagination,changed=false;
      while(cursor.hasMore){
        const next=await request('/api/workspace?page='+(cursor.page+1));assert.ok(next.bytes<1000000,'bounded record response');const page=ok(next);
        if(page.pagination.version!==data.pagination.version){changed=true;break;}
        records.push(...page.records);cursor=page.pagination;
      }
      if(!changed)return {...data,records};
    }
    throw new Error('Snapshot changed repeatedly');
  }
  try{
    await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Next startup timed out')),20000);server.stdout.on('data',()=>{if(log.includes('Ready')){clearTimeout(timeout);resolve();}});server.on('exit',code=>{clearTimeout(timeout);reject(new Error('Next exited '+code));});});
    assert.equal((await request('/api/workspace',{action:'demoTunisia'},false)).r.status,401);
    ok(await request('/api/activation',{email:'owner@example.com',key:secret,password,name:'Test Owner'}));
    const signed=await request('/api/auth/sign-in/email',{email:'owner@example.com',password});ok(signed);cookie=signed.r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    ok(await request('/api/workspace',{action:'company',data:{name:'Existing company preserved'}}));
    if(realData){
      ok(await request('/api/workspace',{action:'save',kind:'clients',data:{name:'Preserved customer',phone:'SIMULATION',status:'active'}}));
      const denied=await request('/api/workspace',{action:'demoTunisia'});assert.equal(denied.r.status,400);assert.equal(denied.data.error,'demo_requires_empty_workspace');
      const current=await state();assert.equal(current.records.length,1);assert.equal(current.records[0].data.name,'Preserved customer');
      console.log('PASS: existing operational records prevent sample loading and remain unchanged.');return;
    }
    const attempts=await Promise.all([request('/api/workspace',{action:'demoTunisia'}),request('/api/workspace',{action:'demoTunisia'})]);
    assert.ok(attempts.some(v=>v.r.status===200),'one atomic load succeeds');
    assert.ok(attempts.every(v=>[200,400].includes(v.r.status)),'concurrent collision is contained');
    const loaded=ok(await request('/api/workspace',{action:'demoTunisia'}));assert.equal(loaded.alreadyLoaded,true);
    const current=await state();const expected=Object.values(loaded.counts).reduce((n,c)=>n+c,0);
    assert.equal(current.records.length,expected+1);assert.equal(new Set(current.records.map(r=>r.id)).size,current.records.length);assert.ok(current.records.every(r=>r.demo===1));assert.ok(current.stock.length>=30);assert.ok(current.serials.length>1000);assert.ok(current.allocations.length>150);assert.equal(current.company.name,'Existing company preserved');
    const incoming=current.records.find(r=>r.kind==='payments'&&r.data.allocations?.length===2);assert.ok(incoming);assert.equal(current.allocations.filter(a=>a.payment_id===incoming.id).length,2);
    const fiscal=current.records.find(r=>r.kind==='withholdings'),blocked=await request('/api/enterprise',{action:'fiscalSubmission',id:fiscal.id,revision:fiscal.revision,reference:'FAKE',fileId:'FAKE'});assert.equal(blocked.data.error,'demo_not_declarable');
    const invoice=current.records.find(r=>r.kind==='invoices'&&r.data.invoiceType==='invoice');
    const posted=ok(await request('/api/business',{action:'accountSource',id:invoice.id,revision:invoice.revision}));assert.equal(posted.id,invoice.data.accountingEntryId,'no duplicate accounting');
    assert.equal((await state()).records.length,current.records.length);
    // Create a genuine staff invitation only inside this disposable test database.
    const role=ok(await request('/api/workspace',{action:'save',kind:'roles',data:{name:'Test read role',rules:[{module:'clients',access:'read'}],status:'active'}})).id;
    const staff=ok(await request('/api/workspace',{action:'save',kind:'users',data:{name:'Test Staff',email:'staff@example.com',roleId:role,status:'active'}})).id;
    const invitation=ok(await request('/api/invitations',{recordId:staff}));const token=new URL(invitation.url).hash.slice('#invite='.length);ok(await request('/api/activation',{action:'invite',token,password,name:'Test Staff'}));
    const login=await request('/api/auth/sign-in/email',{email:'staff@example.com',password});ok(login);cookie=login.r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
    assert.equal((await request('/api/workspace',{action:'demoTunisia'})).r.status,403);
    const staffState=await state();assert.ok(staffState.records.every(r=>r.kind==='clients'));assert.equal(staffState.allocations.length,0);assert.equal(staffState.serials.length,0);
    console.log('PASS: production sample loader, concurrent/idempotent loading, complete trigger-derived stock/serials/allocations, preserved settings, fiscal simulation guard, scoped admin access and accounting deduplication. Records:',expected);
  }catch(error){console.error(log.slice(-2000));throw error;}
  finally{if(server.exitCode===null){server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));}await rm(folder,{recursive:true,force:true});}
}
await scenario();await scenario(true);
