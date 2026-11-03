import test from 'node:test';
import assert from 'node:assert/strict';
import {backupClaimRef,requestEncryptedBackup} from '../scripts/release/request-encrypted-backup.mjs';
const key='2026-11-02T01:00:00.80395Z',sha='a'.repeat(40);
function fixture({active=false,claimed=false,dispatchStatus=204,claimStatus=201}={}){
 const calls=[];
 const fetcher=async(url,options)=>{
  calls.push([url,options]);
  if(url.includes('/runs?'))return {ok:true,json:async()=>({workflow_runs:active?[{
   id:12,event:'workflow_dispatch',status:'in_progress',created_at:new Date().toISOString()}]:[]})};
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
 assert.equal(f.calls.length,5);
 assert.match(f.calls[2][0],/\/git\/refs$/);
 assert.equal(f.calls[4][1].method,'POST');
 assert.deepEqual(JSON.parse(f.calls[4][1].body),{ref:'main'});
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
  if(url.includes('/runs?'))return {ok:true,json:async()=>({workflow_runs:[]})};
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
