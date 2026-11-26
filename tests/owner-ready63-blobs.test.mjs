import test from 'node:test';
import assert from 'node:assert/strict';
import {PIN,OWNER,RECEIPT,blobSha,appendGrant,appendJournal,assertApiOperation} from '../scripts/release/prepare-owner-ready63-blobs.mjs';
const ids=Array.from({length:63},(_,i)=>'DIC-Q-test-'+i);
const raw=JSON.stringify({schema_version:1,history:'preserve',grants:[{id:'historical',data:{keep:[1,2,3]}}]},null,2)+'\n';
const now='2026-11-26T16:00:00.000Z';
test('hash is the real UTF-8 Git blob algorithm',()=>assert.equal(blobSha('hello\n'),'ce013625030ba8dba906f756967f9e9ca394464a'));
test('grant preserves all historical records and binds exactly one source and batch',()=>{
 const {grant,text}=appendGrant(raw,ids,now);const result=JSON.parse(text);const old=JSON.parse(raw);
 assert.equal(result.history,old.history);assert.deepEqual(result.grants.slice(0,-1),old.grants);assert.equal(result.grants.length,old.grants.length+1);
 assert.equal(grant.id,PIN.id);assert.equal(grant.tested_source_sha,PIN.candidate);assert.equal(grant.max_publications,1);assert.equal(grant.production_branch,'release/production');assert.equal(grant.approval_source,OWNER);assert.deepEqual(grant.approved_ready_item_ids,ids.slice().sort());assert.equal(Date.parse(grant.expires_at_utc)-Date.parse(now),86400000);
});
test('rejects empty, partial, duplicate, invalid and already-present batch/grant',()=>{
 for(const bad of [[],ids.slice(1),[...ids.slice(1),ids[1]],[...ids.slice(1),'bad id']])assert.throws(()=>appendGrant(raw,bad,now));
 assert.throws(()=>appendGrant(appendGrant(raw,ids,now).text,ids,now));assert.throws(()=>appendGrant(raw,ids,'invalid'));assert.throws(()=>appendGrant('{"schema_version":2,"grants":[]}',ids,now));
});
test('journal is strictly append-only and carries mandatory exact receipt',()=>{
 const old='# Prior journal\nPreserve literal \\n and CRLF\r\n';const next=appendJournal(old);assert.equal(next.slice(0,old.length),old);
 for(const required of [PIN.id,PIN.candidate,'Mode: publish',RECEIPT])assert.ok(next.slice(old.length).includes(required));assert.throws(()=>appendJournal(''));assert.throws(()=>appendJournal(null));
});
test('only unreachable blob writes; all ref, contents, dispatch and provider endpoints denied',()=>{
 assertApiOperation('POST','git/blobs');assertApiOperation('GET','git/ref/heads/main');assertApiOperation('GET','actions/runs/123/jobs?per_page=100');
 for(const method of ['POST','PUT','PATCH','DELETE'])for(const path of ['git/refs/heads/main','git/ref/heads/release/production','contents/docs/RELEASE_REQUEST.json','actions/workflows/1/dispatches','https://api.netlify.com/api/v1/deploys'])assert.throws(()=>assertApiOperation(method,path));
 assert.throws(()=>assertApiOperation('GET','../../secrets'));assert.throws(()=>assertApiOperation('GET','git/blobs/'+PIN.main+'?redirect=1'));
});
