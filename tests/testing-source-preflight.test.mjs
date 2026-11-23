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

test('merged untracked deployable importer is a HOLD even when owned leaf changed',()=>{
 const missing='src/server/untracked-runtime-importer.mjs';
 const r=inspect(baseline,{firstParentChangedPaths:()=>['src/server/1.mjs',missing]});
 assert.equal(r.items[0].status,'HOLD');
 assert.equal(r.items[0].reason,'MERGED_DEPLOYABLE_SCOPE_UNDECLARED');
 assert.deepEqual(r.items[0].untracked_merged_paths,[missing]);
 assert.equal(r.certified_ready_count,0);
});

test('package-only source cannot omit its co-merged Node runner, CI workflows, or acceptance tests',()=>{
 const packageItems=baseline.items.map((i,n)=>n===0?{...i,scope_paths:['package.json']}:i);
 const packageQueue={...baseline,items:packageItems};
 const changed=['package.json','scripts/audit/run-full-suite.mjs',
  '.github/workflows/cloud-beta-ci.yml','tests/ci-optimization.test.mjs'];
 const r=analyzeTestingBaseline({baselineQueue:packageQueue,liveQueue:packageQueue,
  developmentSha:DEV,...git,firstParentChangedPaths:()=>changed});
 assert.equal(r.items[0].status,'HOLD');
 assert.equal(r.items[0].reason,'MERGED_PACKAGE_EXECUTION_OR_CI_SCOPE_UNDECLARED');
 assert.deepEqual(r.items[0].untracked_merged_paths,changed.slice(1).sort());
 assert.equal(r.certified_ready_count,0);
 const clean=analyzeTestingBaseline({baselineQueue:packageQueue,liveQueue:packageQueue,
  developmentSha:DEV,...git,firstParentChangedPaths:()=>['package.json']});
 assert.equal(clean.items[0].status,'SOURCE_ONLY_PROVISIONAL');
});

import {planProvisionalTestingCandidate,PROVISIONAL_KIND} from '../scripts/release/testing-provisional-plan.mjs';
const psha=x=>x.repeat(40),pid=n=>'DIC-Q-509-'+n;
const pmerge=psha('c'),pdev=psha('d'),ppublished=psha('e');
const prow=n=>({id:pid(n),state:'TESTING',merged_source_sha:n<=42?pmerge:null,
 scope_paths:['supabase/migrations/'+n+'.sql']});
const pbaseline={items:Array.from({length:63},(_,i)=>prow(i+1))};
const plive={...pbaseline,published_base:{tested_source_sha:ppublished}};
const pinventory={kind:'DIC-TESTING-COHORT-SOURCE-INVENTORY-1',
 baseline_dev_sha:'d9fc859d81a23e10ee2cd0e1a37013b93a4980e5',
 baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
 cohort_count:63,certified_ready_count:0,publication_authorized:false,
 fingerprint:psha('1')+'2'.repeat(24),development_sha:pdev,published_source_sha:ppublished,
 items:pbaseline.items.map((i,n)=>({id:i.id,live_state:'TESTING',
 status:n<42?'SOURCE_ONLY_PROVISIONAL':'HOLD',
 reason:n<42?'NEEDS_FROZEN_CANDIDATE_AND_FIVE_EXACT_CI_CHECKS':'NO_RECORDED_MERGED_SOURCE'}))};
const pexec={inventory:pinventory,baselineQueue:pbaseline,liveQueue:plive,selectedId:pid(1),
 developmentChangedPaths:['supabase/migrations/1.sql','src/server/another.mjs','tests/example.test.mjs'],
 firstParentChangedPaths:()=>['supabase/migrations/1.sql','tests/example.test.mjs'],
 sourceObjectAt:(ref,path)=>ref===ppublished?null:'100644:'+psha('a')};
test('phase-two source plan is deterministic and strictly nonpublishing/not READY',()=>{
 const p=planProvisionalTestingCandidate(pexec);
 assert.equal(p.kind,PROVISIONAL_KIND);assert.equal(p.status,'PROVISIONAL_SOURCE_PLAN_ONLY');
 assert.equal(p.publication_authorized,false);assert.equal(p.certified_ready_count,0);
 assert.deepEqual(p.selected_ready_item_ids,[]);assert.equal(p.candidate_sha,null);
 assert.deepEqual(p.selected_blobs.map(x=>x.path),['supabase/migrations/1.sql','tests/example.test.mjs']);
 assert.deepEqual(p.restored_to_published_paths,['src/server/another.mjs']);
 assert.match(p.candidate_branch,/^release-candidates\/testing3889-[0-9a-f]{20}$/);
 assert.equal(p.fingerprint,planProvisionalTestingCandidate(pexec).fingerprint);
});
test('phase-two refuses unmerged, READY-labelled and phase-one HOLD records',()=>{
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,selectedId:pid(43)}),/selected source/);
 const q={...plive,items:plive.items.map(i=>i.id===pid(1)?{...i,state:'READY'}:i)};
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,liveQueue:q}),/selected source/);
 const changed={...pinventory,items:pinventory.items.map(i=>i.id===pid(1)?{...i,status:'HOLD',reason:'MERGED_DEPLOYABLE_SCOPE_UNDECLARED'}:i)};
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,inventory:changed}),/selected source/);
});
test('phase-two refuses changed baseline/owned scope/merged Git identity',()=>{
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,inventory:{...pinventory,baseline_queue_blob:psha('b')}}),/immutable/);
 const q={...plive,items:plive.items.map(i=>i.id===pid(1)?{...i,scope_paths:['src/server/other.mjs']}:i)};
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,liveQueue:q}),/frozen merged SHA/);
 const m={...plive,items:plive.items.map(i=>i.id===pid(1)?{...i,merged_source_sha:psha('f')}:i)};
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,liveQueue:m}),/frozen merged SHA/);
});
test('phase-two refuses omitted importer and package runner/workflow dependency',()=>{
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 firstParentChangedPaths:()=>['supabase/migrations/1.sql','src/server/untracked.mjs']}),/missing from declared scope/);
 const pack={...pbaseline,items:pbaseline.items.map(i=>i.id===pid(1)?{...i,scope_paths:['package.json']}:i)};
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,baselineQueue:pack,
 liveQueue:{...plive,items:pack.items},developmentChangedPaths:['package.json','scripts/audit/runner.mjs'],
 firstParentChangedPaths:()=>['package.json','scripts/audit/runner.mjs']}),/package test runner/);
});
test('phase-two rejects stale acceptance tests, unknown executables and parity gaps',()=>{
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 sourceObjectAt:(ref,path)=>path==='tests/example.test.mjs'&&ref===pdev?'100644:'+psha('b'):ref===ppublished?null:'100644:'+psha('a')}),/not current and unpublished/);
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 developmentChangedPaths:[...pexec.developmentChangedPaths,'dynamic/mystery-loader.mjs']}),/unknown changed-source/);
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 developmentChangedPaths:['src/server/another.mjs']}),/selected path unchanged/);
});
test('phase-two refuses unsafe paths, duplicate diff or inaccessible Git objects',()=>{
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 firstParentChangedPaths:()=>['supabase/migrations/1.sql','../untrusted.mjs']}),/invalid first-parent/);
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,
 developmentChangedPaths:['src/server/another.mjs','src/server/another.mjs']}),/exact queue/);
 assert.throws(()=>planProvisionalTestingCandidate({...pexec,sourceObjectAt:()=>{throw Error('unavailable');}}),/missing source blob/);
});


// Phase 2b: use a disposable, real Git repository to prove exact candidate
// tree isolation without creating any ref, PR, deployment or provider write.
import {mkdtempSync as testMkdtemp,rmSync as testRm,mkdirSync as testMkdir,writeFileSync as testWrite} from 'node:fs';
import {tmpdir as testTmp} from 'node:os';
import {join as testJoin,dirname as testDirname} from 'node:path';
import {execFileSync as testExec} from 'node:child_process';
import {createHash as testHash} from 'node:crypto';
import {freezeProvisionalTestingPlan,FROZEN_TESTING_KIND,FROZEN_TESTING_MANIFEST} from '../scripts/release/stage-testing-provisional-candidate.mjs';
function gitFixture(){
 const dir=testMkdtemp(testJoin(testTmp(),'dic-3889-real-git-'));
 const git=(...args)=>testExec('git',args,{cwd:dir,encoding:'utf8'}).trim();
 const put=(path,body)=>{testMkdir(testDirname(testJoin(dir,path)),{recursive:true});
  testWrite(testJoin(dir,path),body);};
 git('init','-q');git('config','user.email','dic-fixture@example.invalid');
 git('config','user.name','DIC fixture');
 put('docs/ai/PREFLIGHT.md','# Mandatory starting point for EVERY DIC task\nFixture source\n');
 put('docs/RELEASE_QUEUE.json','{"state":"TESTING","source":"unchanged"}\n');
 put('src/server/selected.mjs','export const selected=0;\n');
 put('tests/selected.test.mjs','import {selected} from "../src/server/selected.mjs";\n');
 put('site/unready.js','export const unready=false;\n');
 git('add','.');git('commit','-qm','published baseline');
 const published=git('rev-parse','HEAD');
 put('src/server/selected.mjs','export const selected=1;\n');
 put('tests/selected.test.mjs','import {selected} from "../src/server/selected.mjs";\nif(selected!==1)throw Error("bad");\n');
 put('site/unready.js','export const unready=true;\n');
 git('add','.');git('commit','-qm','unpublished work');
 const development=git('rev-parse','HEAD');
 const shaPath=path=>'100644:'+git('rev-parse',development+':'+path);
 const identity={kind:PROVISIONAL_KIND,baseline_sha:BASELINE_DEV_SHA,
  baseline_blob:BASELINE_QUEUE_BLOB,development_sha:development,
  published_sha:published,selected_testing_item_id:'DIC-Q-509-local-fixture',
  merged_source_sha:development,selected_blobs:[
   {path:'src/server/selected.mjs',source_sha:shaPath('src/server/selected.mjs')},
   {path:'tests/selected.test.mjs',source_sha:shaPath('tests/selected.test.mjs')}],
  restored_to_published_paths:['site/unready.js']};
 const fingerprint=testHash('sha256').update(JSON.stringify(identity)).digest('hex');
 const plan={...identity,fingerprint,
  candidate_branch:'release-candidates/testing3889-'+fingerprint.slice(0,20),
  status:'PROVISIONAL_SOURCE_PLAN_ONLY',candidate_sha:null,
  selected_ready_item_ids:[],applicable_candidate_ci:[],
  certified_ready_count:0,publication_authorized:false};
 return {dir,git,plan,published,development,
  preflight:git('rev-parse',development+':docs/ai/PREFLIGHT.md'),
  cleanup:()=>testRm(dir,{recursive:true,force:true})};
}
test('phase 2b freezes exact one-item Git tree, restores unrelated source, and creates NO refs',()=>{
 const f=gitFixture();
 try{
  const r=freezeProvisionalTestingPlan({repoDir:f.dir,plan:f.plan,preflightBlobSha:f.preflight});
  assert.equal(r.status,'FROZEN_LOCAL_SOURCE_ONLY_NO_REF_OR_CI');
  assert.equal(r.kind,FROZEN_TESTING_KIND);assert.equal(r.publication_authorized,false);
  assert.equal(r.certified_ready_count,0);
  assert.equal(f.git('rev-parse',r.candidate_sha+'^'),f.development);
  assert.equal(f.git('rev-parse',r.candidate_sha+'^{tree}'),r.tree_sha);
  assert.equal(f.git('rev-parse',r.candidate_sha+':site/unready.js'),
   f.git('rev-parse',f.published+':site/unready.js'));
  for(const x of f.plan.selected_blobs)
   assert.equal('100644:'+f.git('rev-parse',r.candidate_sha+':'+x.path),x.source_sha);
  assert.equal(f.git('rev-parse',r.candidate_sha+':docs/RELEASE_QUEUE.json'),
   f.git('rev-parse',f.development+':docs/RELEASE_QUEUE.json'));
  const manifest=JSON.parse(f.git('show',r.candidate_sha+':'+FROZEN_TESTING_MANIFEST));
  assert.equal(manifest.selected_testing_item_id,f.plan.selected_testing_item_id);
  assert.deepEqual(manifest.selected_ready_item_ids,[]);
  assert.equal(manifest.status,'FROZEN_SOURCE_ONLY_CI_NOT_RUN');
  assert.match(f.git('show',r.candidate_sha+':docs/workstreams/issue-3889.md'),
   /DIC_PREFLIGHT_VERIFIED development_sha=/);
  assert.equal(f.git('branch','--list','release-candidates/*'),'');
  assert.equal(f.git('branch','--list').split('\n').length,1);
  assert.throws(()=>f.git('rev-parse',r.candidate_sha+':docs/RELEASE_CANDIDATE.json'));
 }finally{f.cleanup();}
});
test('phase 2b rejects source-plan fingerprint forgery and absent preflight proof',()=>{
 const f=gitFixture();
 try{
  assert.throws(()=>freezeProvisionalTestingPlan({repoDir:f.dir,
   plan:{...f.plan,restored_to_published_paths:[]},preflightBlobSha:f.preflight}),/fingerprint/);
  assert.throws(()=>freezeProvisionalTestingPlan({repoDir:f.dir,
   plan:f.plan,preflightBlobSha:'0'.repeat(40)}),/preflight/);
  assert.throws(()=>freezeProvisionalTestingPlan({repoDir:f.dir,
   plan:{...f.plan,selected_ready_item_ids:['DIC-Q-509-illegal']},
   preflightBlobSha:f.preflight}),/not a single immutable/);
 }finally{f.cleanup();}
});
test('phase 2b rejects unaccounted unfinished executable changes, even if plan hash was recomputed',()=>{
 const f=gitFixture();
 try{
  const forged={...f.plan,restored_to_published_paths:[]};
  const identity={kind:forged.kind,baseline_sha:forged.baseline_sha,
   baseline_blob:forged.baseline_blob,development_sha:forged.development_sha,
   published_sha:forged.published_sha,selected_testing_item_id:forged.selected_testing_item_id,
   merged_source_sha:forged.merged_source_sha,selected_blobs:forged.selected_blobs,
   restored_to_published_paths:forged.restored_to_published_paths};
  const fingerprint=testHash('sha256').update(JSON.stringify(identity)).digest('hex');
  forged.fingerprint=fingerprint;forged.candidate_branch='release-candidates/testing3889-'+fingerprint.slice(0,20);
  assert.throws(()=>freezeProvisionalTestingPlan({repoDir:f.dir,plan:forged,
   preflightBlobSha:f.preflight}),/account for all changed executable source/);
 }finally{f.cleanup();}
});
