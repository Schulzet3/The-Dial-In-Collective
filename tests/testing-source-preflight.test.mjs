import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeTestingBaseline,BASELINE_DEV_SHA,BASELINE_QUEUE_BLOB} from '../scripts/release/testing-source-preflight.mjs';
const sha=(c)=>c.repeat(40);
const DEV=sha('d'),PUB=sha('a'),MERGE=sha('b'),BLOB=sha('1');
const row=(n)=>({id:'DIC-Q-33-'+n,issue:33,state:'TESTING',
 merged_source_sha:n<=42?MERGE:null,scope_paths:['src/server/'+n+'.mjs']});
const baseline={schema_version:1,published_base:{tested_source_sha:PUB},
 items:Array.from({length:63},(_,i)=>row(i+1))};
const git={sourceObjectAt:(ref,path)=>ref===PUB?null:'100644:'+BLOB,
 isAncestor:()=>true,firstParentChangedPaths:()=>['src/server/1.mjs']};
const inspect=(live=baseline,over={})=>analyzeTestingBaseline({baselineQueue:baseline,
 liveQueue:live,developmentSha:DEV,...git,...over});
test('phase one pins 63 immutable IDs, never emits READY or publishing authority',()=>{
 const r=inspect();assert.equal(r.cohort_count,63);assert.equal(r.certified_ready_count,0);
 assert.equal(r.publication_authorized,false);assert.equal(r.baseline_dev_sha,BASELINE_DEV_SHA);
 assert.equal(r.baseline_queue_blob,BASELINE_QUEUE_BLOB);
 assert.equal(r.items[0].status,'SOURCE_ONLY_PROVISIONAL');
 assert.equal(r.items[0].reason,'NEEDS_FROZEN_CANDIDATE_AND_FIVE_EXACT_CI_CHECKS');
 assert.equal(r.items[42].reason,'NO_RECORDED_MERGED_SOURCE');
 assert.equal(r.items.length,new Set(r.items.map(i=>i.id)).size);
 assert.match(r.fingerprint,/^[0-9a-f]{64}$/);
});
test('shared unready owner prevents an isolated source claim',()=>{
 const live={...baseline,items:baseline.items.map(i=>i.id==='DIC-Q-33-2'?{...i,scope_paths:['src/server/1.mjs']}:i)};
 assert.equal(inspect(live).items[0].reason,'SHARED_UNREADY_SOURCE_REQUIRES_ISOLATION');
});
test('post-merge edits or published parity HOLD even when merge existed',()=>{
 assert.equal(inspect(baseline,{sourceObjectAt:(ref,path)=>ref===DEV?'100644:'+sha('2'):
   ref===PUB?null:'100644:'+BLOB}).items[0].reason,'SOURCE_CHANGED_AFTER_MERGE_OR_MISSING');
 assert.equal(inspect(baseline,{sourceObjectAt:()=> '100644:'+BLOB}).items[0].reason,
  'SOURCE_EQUALS_PUBLISHED_OR_SCOPE_PARTIALLY_UNCHANGED');
});
test('absence of exact ancestry and first-parent ownership is a HOLD',()=>{
 assert.equal(inspect(baseline,{isAncestor:()=>false}).items[0].reason,'MERGE_NOT_IN_EXACT_DEVELOPMENT_ANCESTRY');
 assert.equal(inspect(baseline,{firstParentChangedPaths:()=>['docs/journal.md']}).items[0].reason,
  'NO_OWNED_FIRST_PARENT_DEPLOYABLE_CHANGE');
 assert.equal(inspect(baseline,{firstParentChangedPaths:()=>{throw Error('unavailable')}}).items[0].reason,
  'GIT_PROOF_UNAVAILABLE');
});
test('READY-labelled queue row is never independently certified by this utility',()=>{
 const live={...baseline,items:baseline.items.map(i=>i.id==='DIC-Q-33-1'?{...i,state:'READY'}:i)};
 assert.equal(inspect(live).items[0].reason,'READY_OR_DEPLOYED_REQUIRES_INDEPENDENT_CERTIFICATE');
 assert.equal(inspect(live).certified_ready_count,0);
});
test('invalid baseline structure and altered 63/42/21 immutable cohort fail closed',()=>{
 assert.throws(()=>analyzeTestingBaseline({baselineQueue:{},liveQueue:baseline,developmentSha:DEV,...git}),/BLOCKED/);
 assert.throws(()=>analyzeTestingBaseline({baselineQueue:{...baseline,items:baseline.items.slice(1)},liveQueue:baseline,developmentSha:DEV,...git}),/63\/42\/21/);
});
