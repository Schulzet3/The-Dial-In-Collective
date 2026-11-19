import test from 'node:test';
import assert from 'node:assert/strict';
import {frozenReadyBranch,requiredReadyPins,selectedReadyItems,
 prevalidateReadySource,neutralWorkflowTransportCommit,candidateTreeReceipt} from '../scripts/release/precertify-ready-source.mjs';
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
 const second={...one,id:'DIC-Q-102',issue:102,merged_source_sha:C};
 assert.throws(()=>requiredReadyPins({...queue,items:[one,second,unmerged]},
  [one.id,second.id],['site/main.js'],
  {...exact,isAncestor:()=>{throw Error('missing commit');}}),/ancestry\/parity unavailable/,
  'ambiguously ordered co-selected READY merges must fail closed');
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

import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
test('#3347 transport carries exact candidate app bytes but NEVER mutates workflow files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-ready-transport-unit-'));
 const git=(...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8'}).trim();
 const file=(p,s)=>{mkdirSync(join(dir,p.slice(0,p.lastIndexOf('/'))),{recursive:true});writeFileSync(join(dir,p),s);};
 try{
  git('init','-q');git('config','user.email','test@example.com');git('config','user.name','test');
  file('.github/workflows/ci.yml','name: older\n');file('site/main.js','published');
  git('add','-A');git('commit','-qm','published');const pub=git('rev-parse','HEAD');
  file('.github/workflows/ci.yml','name: new\n');file('site/main.js','ready-app');
  git('add','-A');git('commit','-qm','development');const dev=git('rev-parse','HEAD');
  file('.github/workflows/ci.yml','name: older\n');
  git('add','-A');git('commit','-qm','candidate');const candidate=git('rev-parse','HEAD');
  const x=neutralWorkflowTransportCommit({repoDir:dir,developmentSourceSha:dev,candidateSha:candidate,
   workflowPaths:['.github/workflows/ci.yml']});
  assert.match(x.transport_sha,/^[a-f0-9]{40}$/);
  assert.equal(git('show',x.transport_sha+':.github/workflows/ci.yml'),'name: new');
  assert.equal(git('show',candidate+':.github/workflows/ci.yml'),'name: older');
  assert.equal(git('show',x.transport_sha+':site/main.js'),'ready-app');
  assert.equal(git('rev-parse',x.transport_sha+'^'),dev);
  assert.equal(git('rev-parse','HEAD'),candidate);
  assert.throws(()=>neutralWorkflowTransportCommit({repoDir:dir,developmentSourceSha:dev,
   candidateSha:candidate,workflowPaths:['../../.github/workflows/ci.yml']}),/Unsafe transport/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// Source staging has additional full Git fixture tests; read-only export must
// deny missing local candidate objects rather than invent a certified tree.
test('#3347 connector source receipt fail-closes absent staged tree and no Actions push',()=>{
 assert.throws(()=>candidateTreeReceipt({developmentSourceSha:'a'.repeat(40),staged:{candidate_sha:'b'.repeat(40)}}),/No verified staged/);
 assert.throws(()=>prevalidateReadySource({developmentSourceSha:'a'.repeat(40),push:true}),/Actions ref push prohibited/);
});
