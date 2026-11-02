import test from 'node:test';
import assert from 'node:assert/strict';
import {requestEncryptedBackup} from '../scripts/release/request-encrypted-backup.mjs';
test('manual fallback dispatches only existing main encrypted backup workflow',async()=>{
 let calls=[];
 const result=await requestEncryptedBackup({token:'fake',fetcher:async(u,o)=>{calls.push([u,o]);return o.method==='GET'?{ok:true,json:async()=>({workflow_runs:[]})}:{status:204};}});
 assert.equal(result.status,'BACKUP_REQUESTED_NOT_VERIFIED');
 assert.equal(calls.length,2);
 assert.match(calls[1][0],/nightly-backup.yml\/dispatches$/);
 assert.equal(calls[1][1].method,'POST');
 assert.deepEqual(JSON.parse(calls[1][1].body),{ref:'main'});
 await assert.rejects(requestEncryptedBackup({token:''}));
 await assert.rejects(requestEncryptedBackup({token:'fake',fetcher:async()=>({status:403})}));
});

test('active backup suppresses duplicate dispatch and malformed run lookup fails closed',async()=>{
 let posts=0;
 const active=await requestEncryptedBackup({token:'fake',fetcher:async(u,o)=>{if(o.method==='POST')posts++;return {ok:true,json:async()=>({workflow_runs:[{id:12,event:'workflow_dispatch',status:'in_progress',created_at:new Date().toISOString()}]})};}});
 assert.equal(active.status,'BACKUP_ALREADY_RUNNING_NOT_VERIFIED');assert.equal(posts,0);
 await assert.rejects(requestEncryptedBackup({token:'fake',fetcher:async()=>({ok:false,status:403})}));
});
