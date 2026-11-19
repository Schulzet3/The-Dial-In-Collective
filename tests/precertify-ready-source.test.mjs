import test from 'node:test';
import assert from 'node:assert/strict';
import {frozenReadyBranch,requiredReadyPins,selectedReadyItems,
 prevalidateReadySource} from '../scripts/release/precertify-ready-source.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
const one={id:'DIC-Q-100',issue:100,title:'ready',owner_source:'owner approval',
 state:'READY',merged_source_sha:B,scope_paths:['site/main.js'],
 tests:['source verified'],ci_runs:[123],blockers:[]};
const notReady={...one,id:'DIC-Q-101',issue:101,state:'TESTING',
 scope_paths:['site/main.js','src/server/unready.mjs'],
 tests:[],ci_runs:[],blockers:['pending']};
const q={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:A,release_sha:C,netlify_deploy_id:'receipt'},
 items:[one,notReady],history:[]};
test('#3347 source-bound READY pins exactly the genuine READY/unready shared path',()=>{
 assert.deepEqual(selectedReadyItems(q).map(i=>i.id),['DIC-Q-100']);
 assert.deepEqual(requiredReadyPins(q,[one.id],
  ['site/main.js','src/server/unready.mjs']),['site/main.js']);
 assert.deepEqual(requiredReadyPins({...q,items:[one]},[one.id],['site/main.js']),[]);
 assert.throws(()=>requiredReadyPins(q,[notReady.id],['site/main.js']),/not source-certified/);
 assert.throws(()=>requiredReadyPins(q,[one.id,one.id],['site/main.js']),/source\/selection unavailable/);
});
test('#3347 pre-certification skips only source-proven unmerged same-file labels',()=>{
 const unmerged={...notReady,merged_source_sha:null};
 const queue={...q,items:[one,unmerged]};
 const frozen='100644:'+'e'.repeat(40),changed='100644:'+'f'.repeat(40);
 const at=(ref,path)=>path==='site/main.js'?
  (ref===B||ref===C?frozen:null):null;
 const exact={developmentSourceSha:C,sourceObjectAt:at,isAncestor:(a,b)=>a===B&&b===C};
 assert.deepEqual(requiredReadyPins(queue,[one.id],
  ['site/main.js','src/server/unready.mjs'],exact),[]);
 assert.deepEqual(requiredReadyPins(queue,[one.id],['site/main.js'],
  {...exact,sourceObjectAt:(ref,path)=>ref===C&&path==='site/main.js'?changed:at(ref,path)}),
  ['site/main.js'],'real post-READY edit must still require exact isolation pin');
 assert.deepEqual(requiredReadyPins(queue,[one.id],['site/main.js']),
  ['site/main.js'],'no Git object reader must never waive pin');
 assert.deepEqual(requiredReadyPins({...queue,items:[one,{...unmerged,merged_source_sha:B}]},
  [one.id],['site/main.js'],exact),['site/main.js'],
  'merged competing change never receives unmerged-label exception');
 assert.throws(()=>requiredReadyPins(queue,[one.id],['site/main.js'],
  {...exact,isAncestor:()=>{throw Error('missing commit');}}),/ancestry\/parity unavailable/);
});
test('#3347 candidate name is stable across unready changes, but changes with READY bytes',()=>{
 const b=frozenReadyBranch(q,[one]);
 assert.match(b,/^release-candidates\/ready3347-[a-f0-9]{20}$/);
 assert.equal(frozenReadyBranch({...q,items:[one,{...notReady,scope_paths:['site/other.js']}]},[one]),b);
 assert.notEqual(frozenReadyBranch(q,[{...one,merged_source_sha:C}]),b);
 assert.notEqual(frozenReadyBranch({...q,published_base:{...q.published_base,tested_source_sha:C}},[one]),b);
});
test('#3347 no candidate can be pushed without authenticated CI main context',()=>{
 assert.throws(()=>prevalidateReadySource({developmentSourceSha:'not-a-sha'}),/Exact development/);
 assert.throws(()=>selectedReadyItems({...q,authority:'wrong'}),/schema HOLD/);
});
