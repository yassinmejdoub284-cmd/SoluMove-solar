import assert from 'node:assert/strict';
import {fetchWorkspaceSnapshot,emptyData} from '../lib/solar/client';

const original=globalThis.fetch;
let starts=0;
try {
  globalThis.fetch=async(input:any)=>{
    const page=Number(new URL(String(input),'https://test.example').searchParams.get('page'));
    if(page===0)starts++;
    const version=starts===1&&page===0?'old':'new';
    return Response.json({...emptyData,records:page<2?[{id:'record-'+page,data:{},kind:'clients'}]:[],pagination:{page,hasMore:page===0,version}});
  };
  const complete=await fetchWorkspaceSnapshot();
  assert.equal(starts,2,'restart after a record changes between pages');
  assert.deepEqual(complete.records.map(r=>r.id),['record-0','record-1']);
  assert.ok(!('pagination' in complete),'snapshot is complete, not a page');
  globalThis.fetch=async(input:any)=>{
    const page=Number(new URL(String(input),'https://test.example').searchParams.get('page'));
    return page===1?Response.json({error:'storage_unavailable'},{status:503}):Response.json({...emptyData,records:[],pagination:{page,hasMore:page===0,version:'fixed'}});
  };
  await assert.rejects(fetchWorkspaceSnapshot(),/storage_unavailable/);
  assert.deepEqual(emptyData.records,[],'failed reads never alter the previous state');
  console.log('PASS: complete paged snapshots, version-change retry, and failed-page isolation.');
} finally {globalThis.fetch=original;}
