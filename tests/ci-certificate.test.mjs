import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('CI certificate binds exact source and does not claim publication',()=>{
 const s=readFileSync(new URL('../scripts/release/write-ci-certificate.mjs',import.meta.url),'utf8');
 assert.match(s,/sha!==head/);
 assert.match(s,/NOT_RELEASE_APPROVAL/);
 assert.match(s,/github_run_id/);
});

test('certificate explicitly distinguishes safe READY from no batch and blocked source',async()=>{
 const {classifyBatch}=await import('../scripts/release/ci-batch-classification.mjs');
 assert.equal(classifyBatch({ready:true,ready_items:[{id:'A'}],deployable_paths:['site/a'],errors:[]}), 'CERTIFIED_READY_SOURCE');
 assert.equal(classifyBatch({ready:false,ready_items:[],deployable_paths:[],errors:['No new deployable application changes since published source']}),'NO_BATCH');
 assert.equal(classifyBatch({ready:false,ready_items:[],deployable_paths:['site/a'],errors:['Unqueued or not-ready deployable file: site/a']}),'BLOCKED_NOT_RELEASABLE');
 assert.equal(classifyBatch({ready:false,ready_items:[{id:'A'}],deployable_paths:['site/a'],errors:['unready']}),'BLOCKED_NOT_RELEASABLE');
});

test('READY certificate cannot be issued without the exact hashed immutable artifact',()=>{
 const s=readFileSync(new URL('../scripts/release/write-ci-certificate.mjs',import.meta.url),'utf8');
 assert.match(s,/CERTIFIED_READY_SOURCE'&&!artifactHash/);
 assert.match(s,/createHash\('sha256'\)/);
 assert.match(s,/immutable_artifact_sha256:artifactHash/);
 assert.match(s,/immutable_artifact_name:artifactHash\?/);
});
