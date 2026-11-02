import test from 'node:test';
import assert from 'node:assert/strict';
import {backupClaimRef,requestEncryptedBackup} from '../scripts/release/request-encrypted-backup.mjs';
const key='2026-11-02T01:00:00.80395Z',sha='a'.repeat(40);
function fixture({active=false,activeStatus='in_progress',activeEvent='workflow_dispatch',
 activeCreatedAt=new Date().toISOString(),runInventory='complete',
 claimed=false,dispatchStatus=204,claimStatus=201}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push([url,options]);
  if(url.includes('/runs?')){
   const status=new URL(url).searchParams.get('status');
   const items=active&&status===activeStatus?[{
    id:12,event:activeEvent,status:activeStatus,created_at:activeCreatedAt}]:[];
   const count=runInventory==='truncated'&&status==='requested'?2:
    runInventory==='oversized'&&status==='requested'?101:items.length;
   return {ok:true,json:async()=>runInventory==='missing-total'&&status==='requested'?
    {workflow_runs:items}:{total_count:count,workflow_runs:items}};
  }
  if(url.endsWith('/git/ref/heads/main'))return {ok:true,json:async()=>({object:{sha}})};
  if(url.endsWith('/git/refs'))return {status:claimed?422:claimStatus,
   json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  if(url.includes('/git/ref/heads/dic-backup-claims/'))return {
   ok:true,json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  if(url.endsWith('/dispatches'))return {status:dispatchStatus};
  throw Error('Unexpected mock API '+url);
 };
 return {fetcher,calls};
}
test('creates durable GitHub claim before dispatch; returns no offsite verification',async()=>{
 const f=fixture();
 const r=await requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher:f.fetcher});
 assert.equal(r.status,'BACKUP_REQUESTED_NOT_VERIFIED');
 assert.equal(f.calls.length,9);
 assert.match(f.calls[6][0],/\/git\/refs$/);
 assert.equal(f.calls[8][1].method,'POST');
 assert.deepEqual(JSON.parse(f.calls[8][1].body),{ref:'main'});
 assert.equal(r.claim_ref,backupClaimRef(key));
});
test('existing claim or running backup suppresses dispatch',async()=>{
 for(const config of [{claimed:true},{active:true}]){
  const f=fixture(config);
  const r=await requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher:f.fetcher});
  assert.match(r.status,/ALREADY_/);
  assert.equal(f.calls.filter(x=>x[0].endsWith('/dispatches')).length,0);
 }
});
test('missing freshness, claim failure and dispatch uncertainty fail closed',async()=>{
 await assert.rejects(requestEncryptedBackup({token:'fake',freshnessKey:'bad'}));
 await assert.rejects(requestEncryptedBackup({token:'',freshnessKey:key}));
 for(const config of [{claimStatus:403},{dispatchStatus:503}]){
  const f=fixture(config);
  await assert.rejects(requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher:f.fetcher}));
  if(config.claimStatus===403)assert.equal(f.calls.some(x=>x[0].endsWith('/dispatches')),false);
 }
});
test('simultaneous claim contenders dispatch at most once',async()=>{
 let claimed=false,dispatches=0;
 const fetcher=async(url)=>{
  if(url.includes('/runs?'))return {ok:true,json:async()=>({total_count:0,workflow_runs:[]})};
  if(url.endsWith('/git/ref/heads/main'))return {ok:true,json:async()=>({object:{sha}})};
  if(url.endsWith('/git/refs')){
   if(claimed)return {status:422};
   claimed=true;
   return {status:201,json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  }
  if(url.includes('/git/ref/heads/dic-backup-claims/'))return {ok:true,
   json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  if(url.endsWith('/dispatches')){dispatches++;return {status:204};}
  throw Error('Unexpected mock URL');
 };
 const [a,b]=await Promise.all([
  requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher}),
  requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher})]);
 assert.equal(dispatches,1);
 assert.deepEqual([a.status,b.status].sort(),
  ['BACKUP_ALREADY_CLAIMED_NOT_VERIFIED','BACKUP_REQUESTED_NOT_VERIFIED'].sort());
});

test('different write instants on one UTC day share a durable dispatch claim',()=>{
 const later='2026-11-02T23:59:59.999999999Z';
 assert.equal(backupClaimRef(key),backupClaimRef(later));
 assert.notEqual(backupClaimRef(key),backupClaimRef('2026-11-03T00:00:00Z'));
 assert.throws(()=>backupClaimRef('2026-02-31T12:00:00Z'),/timestamp required/);
});
test('concurrent DIFFERENT freshness keys on one UTC day cannot double-dispatch',async()=>{
 let claimed=false,dispatches=0;
 const fetcher=async url=>{
  if(url.includes('/runs?'))return {ok:true,json:async()=>({total_count:0,workflow_runs:[]})};
  if(url.endsWith('/git/ref/heads/main'))return {ok:true,json:async()=>({object:{sha}})};
  if(url.endsWith('/git/refs')){
   if(claimed)return {status:422};
   claimed=true;
   return {status:201,json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  }
  if(url.includes('/git/ref/heads/dic-backup-claims/'))return {ok:true,
   json:async()=>({ref:backupClaimRef(key),object:{sha}})};
  if(url.endsWith('/dispatches')){dispatches++;return {status:204};}
  throw Error('Unexpected mock URL '+url);
 };
 const [a,b]=await Promise.all([
  requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher}),
  requestEncryptedBackup({token:'fake',freshnessKey:'2026-11-02T23:59:59.999999Z',fetcher})]);
 assert.equal(dispatches,1);
 assert.deepEqual([a.status,b.status].sort(),
  ['BACKUP_ALREADY_CLAIMED_NOT_VERIFIED','BACKUP_REQUESTED_NOT_VERIFIED'].sort());
});

test('old active push and waiting backup runs suppress fallback regardless of age',async()=>{
 for(const patch of [{active:true,activeEvent:'push',
  activeCreatedAt:'2026-10-01T00:00:00Z'},
  {active:true,activeStatus:'waiting',activeEvent:'schedule',
   activeCreatedAt:'2026-10-01T00:00:00Z'}]){
  const f=fixture(patch);
  const result=await requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher:f.fetcher});
  assert.equal(result.status,'BACKUP_ALREADY_RUNNING_NOT_VERIFIED');
  assert.equal(f.calls.some(([url])=>url.endsWith('/git/refs')||url.endsWith('/dispatches')),false);
 }
});
test('missing, truncated or oversized active-run inventory cannot create a backup claim',async()=>{
 for(const runInventory of ['missing-total','truncated','oversized']){
  const f=fixture({runInventory});
  await assert.rejects(requestEncryptedBackup({token:'fake',freshnessKey:key,fetcher:f.fetcher}),
   /Incomplete active backup run inventory/);
  assert.equal(f.calls.some(([url])=>url.endsWith('/git/refs')||url.endsWith('/dispatches')),false);
 }
});
