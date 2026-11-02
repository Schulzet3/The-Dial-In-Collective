import test from 'node:test';
import assert from 'node:assert/strict';
import {requestEncryptedBackup} from '../scripts/release/request-encrypted-backup.mjs';
test('manual fallback dispatches only existing main encrypted backup workflow',async()=>{
 let calls=[];
 const result=await requestEncryptedBackup({token:'fake',fetcher:async(u,o)=>{calls.push([u,o]);return {status:204};}});
 assert.equal(result.status,'BACKUP_REQUESTED_NOT_VERIFIED');
 assert.equal(calls.length,1);
 assert.match(calls[0][0],/nightly-backup.yml\/dispatches$/);
 assert.equal(calls[0][1].method,'POST');
 assert.deepEqual(JSON.parse(calls[0][1].body),{ref:'main'});
 await assert.rejects(requestEncryptedBackup({token:''}));
 await assert.rejects(requestEncryptedBackup({token:'fake',fetcher:async()=>({status:403})}));
});
