import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planReadyOnlyCandidate,validateReadyOnlyCandidate,matchesCandidateChangedPaths,CANDIDATE_KIND,
 CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH,REVIEWED_WORKFLOW_TEST,discoverReviewedWorkflowTestExclusions,discoverExcludedUnreadyTests,assertCandidateRelativeImports,
 assertCandidateStaticNamedExports,discoverReviewedRestoredSqlTests,REVIEWED_SOURCE_PATH_CASE_SQL_TEST,REVIEWED_UNREADY_SQL_SUITE,discoverReviewedRestoredR232CoffeeTests,REVIEWED_R232_COFFEE_TEST,discoverReviewedRestoredUnreadyAdminTests,REVIEWED_UNREADY_ADMIN_TEST,REVIEWED_PINNED_COFFEE_TEST} from '../scripts/release/ready-only-candidate.mjs';
import {classifyReleaseRisk} from '../scripts/release/release-reliability.mjs';
const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),D='d'.repeat(40);
const one={id:'DIC-Q-100',issue:100,title:'READY card',state:'READY',
 owner_source:'https://github.com/example/repo/issues/100',merged_source_sha:D,
 scope_paths:['site/card.js'],tests:['source PASS'],ci_runs:[123],blockers:[]};
const unfinished={...one,id:'DIC-Q-101',issue:101,title:'unfinished extractor',
 state:'IN_PROGRESS',merged_source_sha:null,scope_paths:['src/server/extractor.mjs'],
 tests:[],ci_runs:[],blockers:['review']};
const q={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:A,release_sha:B,netlify_deploy_id:'d'},items:[one,unfinished],history:[]};
const ancestor=(x,y)=>x===y||(x===A&&[B,C,D].includes(y))||(x===D&&y===B)||
 (x===B&&y===C);
const opts={publishedSourceSha:A,developmentSourceSha:B,selectedIds:[one.id],
 developmentChangedPaths:['site/card.js','src/server/extractor.mjs'],isAncestor:ancestor};
const manifest={schema_version:1,kind:CANDIDATE_KIND,published_source_sha:A,
 development_source_sha:B,candidate_branch:'release-candidates/dic-100',
 selected_ready_item_ids:[one.id],risk_classification:classifyReleaseRisk(['site/card.js']),
 restored_to_published_paths:['src/server/extractor.mjs']};
const validate={manifest,publishedSourceSha:A,developmentHead:B,candidateSha:C,
 actualParents:[C,B],developmentChangedPaths:opts.developmentChangedPaths,
 candidateChangedPaths:['site/card.js'],
 stagedCommitChangedPaths:[CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH,'src/server/extractor.mjs'],
 developmentDriftPaths:[],queueContentMatches:true,candidateBranch:manifest.candidate_branch,
 isAncestor:ancestor,sourceObjectAt:(sha,path)=>path==='site/card.js'?(sha===A?'old':'new'):
  (sha===B?'unfinished':'published')};
test('stage only selected READY source and restore unfinished paths to published bytes',()=>{
 const plan=planReadyOnlyCandidate(q,opts);
 assert.equal(plan.ready,true,plan.errors.join('; '));
 assert.deepEqual(plan.included_paths,['site/card.js']);
 assert.deepEqual(plan.restored_paths,['src/server/extractor.mjs']);
 const good=validateReadyOnlyCandidate(q,validate);
 assert.equal(good.ready,true);
 assert.deepEqual(good.ready_items.map(x=>x.id),[one.id]);
});
test('#3347 published frozen candidate may be a detached one-parent sibling of active development',()=>{
 const P='e'.repeat(40),F='f'.repeat(40);
 const queue={...q,published_base:{...q.published_base,tested_source_sha:P}};
 const detachedAncestor=(a,b)=>a===P&&b===B?false:
  a===P+'^'&&b===B?true:ancestor(a,b);
 const sourceObjectAt=(sha,path)=>path===CANDIDATE_RECEIPT_PATH?
  (sha===P?'100644:'+F:null):validate.sourceObjectAt(sha,path);
 const input={...opts,publishedSourceSha:P,isAncestor:detachedAncestor,sourceObjectAt};
 const accepted=planReadyOnlyCandidate(queue,input);
 assert.equal(accepted.ready,true,accepted.errors.join('; '));
 assert.deepEqual(accepted.included_paths,['site/card.js']);
 const candidate={...validate,publishedSourceSha:P,sourceObjectAt,
  manifest:{...manifest,published_source_sha:P},isAncestor:detachedAncestor};
 assert.equal(validateReadyOnlyCandidate(queue,candidate).ready,true,
  'the same detached frozen source must pass the release validator');
 for(const denied of [
  {...input,sourceObjectAt:(sha,path)=>path===CANDIDATE_RECEIPT_PATH?null:sourceObjectAt(sha,path)},
  {...input,isAncestor:(a,b)=>a===P+'^'&&b===B?false:detachedAncestor(a,b)},
  {...input,sourceObjectAt:undefined}
 ])assert.equal(planReadyOnlyCandidate(queue,denied).ready,false,
  'missing frozen candidate manifest, parent lineage, or exact object reader must HOLD');
 assert.equal(planReadyOnlyCandidate({...queue,published_base:{...queue.published_base,release_sha:null}},input).ready,false,
  'unverified published release pointer must HOLD');
 assert.equal(planReadyOnlyCandidate({...queue,published_base:{...queue.published_base,netlify_deploy_id:''}},input).ready,false,
  'missing actual Netlify delivery receipt must HOLD');
});

test('post-staging unready development drift is excluded without weakening exact READY proof',()=>{
 const E='e'.repeat(40);
 const newer={...unfinished,id:'DIC-Q-102',issue:102,
  scope_paths:['site/card.js','src/server/new-research.mjs']};
 const live={...q,items:[one,unfinished,newer]};
 const newerAncestry=(a,b)=>ancestor(a,b)||(b===E&&[A,B,C,D].includes(a));
 const input={...validate,developmentHead:E,developmentDriftPaths:[
  'site/card.js','src/server/new-research.mjs'],liveQueue:live,isAncestor:newerAncestry};
 const result=validateReadyOnlyCandidate(q,input);
 assert.equal(result.ready,true);
 assert.deepEqual(result.deployable_paths,['site/card.js']);
 // The candidate frozen at C still has only the selected READY path; both
 // newer unfinished paths remain on development and never enter publication.
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,liveQueue:undefined}),/without verifiable current queue/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,liveQueue:q}),/lack an excluded post-staging owner/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,developmentDriftPaths:['scripts/netlify/should-ignore-build.mjs']}),/lack an excluded post-staging owner/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,liveQueue:{...live,items:[{...one,title:'Changed READY approval'},unfinished,newer]}}),/Selected READY record changed/);
 const newReady={...one,id:'DIC-Q-103',issue:103,
  scope_paths:['src/server/post-stage-ready.mjs'],merged_source_sha:E};
 const expanded={...input,liveQueue:{...live,items:[one,unfinished,newer,newReady]},
  developmentDriftPaths:['site/card.js','src/server/post-stage-ready.mjs']};
 assert.equal(validateReadyOnlyCandidate(q,expanded).ready,true,
  'later READY source is NOT part of frozen tested release and stays queued');
 assert.throws(()=>validateReadyOnlyCandidate(q,{...expanded,
  liveQueue:{...live,items:[one,unfinished,newer,{...newReady,merged_source_sha:D}]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...expanded,
  liveQueue:{...live,items:[one,unfinished,newer]}}),/lack an excluded post-staging owner/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,liveQueue:{...live,items:[one,unfinished,{...newer,state:'READY',tests:['x'],ci_runs:[1],merged_source_sha:D,blockers:[]}]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,queueContentMatches:false}),/immutable staging-source queue/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,sourceObjectAt:(sha,path)=>
   path==='site/card.js'&&sha===C?'unready late edit':validate.sourceObjectAt(sha,path)}),/changed during isolation/);
});

test('later READY promotion of originally unready source stays excluded if exactly restored',()=>{
 const promoted={...unfinished,state:'READY',merged_source_sha:D,
  tests:['passed focused source check'],ci_runs:[456],blockers:[]};
 const live={...q,items:[one,promoted]};
 const input={...validate,liveQueue:live};
 const accepted=validateReadyOnlyCandidate(q,input);
 assert.equal(accepted.ready,true,
  'separately promoted READY source predating staging cannot enter candidate when restored');
 assert.deepEqual(accepted.deployable_paths,['site/card.js']);
 assert.deepEqual(accepted.excluded_paths,['src/server/extractor.mjs']);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,
  sourceObjectAt:(sha,path)=>sha===C&&path==='src/server/extractor.mjs'?'accidental-ready-code':validate.sourceObjectAt(sha,path)}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,
  liveQueue:{...q,items:[one,{...promoted,scope_paths:['site/card.js']}]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...input,
  liveQueue:{...q,items:[one,unfinished,{...promoted,id:'DIC-Q-102',issue:102}]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
});

test('unselected frozen READY source stays excluded by exact published-byte restoration',()=>{
 const unselected={...one,id:'DIC-Q-104',issue:104,title:'separately READY parser',
  scope_paths:['src/server/extractor.mjs']};
 const queue={...q,items:[one,unselected,unfinished]};
 const validated=validateReadyOnlyCandidate(queue,{...validate,liveQueue:queue});
 assert.equal(validated.ready,true);
 assert.deepEqual(validated.ready_items.map(i=>i.id),[one.id]);
 assert.deepEqual(validated.excluded_paths,['src/server/extractor.mjs']);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...validate,liveQueue:queue,
  sourceObjectAt:(sha,path)=>sha===C&&path==='src/server/extractor.mjs'?'unselected READY code leaked':validate.sourceObjectAt(sha,path)}),
  /candidate HOLD/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...validate,
  liveQueue:{...queue,items:[one,{...unselected,title:'Changed approval'},unfinished]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...validate,
  liveQueue:{...queue,items:[one,{...unselected,scope_paths:['site/card.js']},unfinished]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology/);
});

test('mixed READY/unready source can ship only exact pinned approved READY blob',()=>{
 const overlap={...unfinished,id:'DIC-Q-102',issue:102,state:'TESTING',scope_paths:['site/card.js']};
 const queue={...q,items:[one,unfinished,overlap]};
 const overlapManifest={...manifest,pinned_to_ready_paths:['site/card.js']};
 const sourceObjectAt=(sha,path)=>path==='site/card.js'?
  (sha===A?'published-old':sha===B?'unready-mixed':'approved-ready'):
  (sha===B?'unfinished':'published');
 const input={...validate,manifest:overlapManifest,
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,'site/card.js'],sourceObjectAt};
 const planned=planReadyOnlyCandidate(queue,{...opts,pinnedReadyPaths:['site/card.js']});
 assert.equal(planned.ready,true,planned.errors.join('; '));
 const valid=validateReadyOnlyCandidate(queue,input);
 assert.equal(valid.ready,true);
 assert.deepEqual(valid.pinned_ready_paths,['site/card.js']);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...input,
  manifest:{...overlapManifest,pinned_to_ready_paths:[]}}),/candidate HOLD/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...input,
  sourceObjectAt:(sha,path)=>path==='site/card.js'&&sha===C?'unready-mixed':sourceObjectAt(sha,path)}),/not actually isolated|edits after its verified READY merge/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...input,
  stagedCommitChangedPaths:validate.stagedCommitChangedPaths}),/candidate HOLD/);
 assert.equal(planReadyOnlyCandidate(queue,opts).ready,false);
 const excluded='tests/issue102-unfinished-scope.test.mjs';
 const testObjectAt=(sha,path)=>path===excluded?(sha===B?'new-unready-test':null):sourceObjectAt(sha,path);
 const withTest={...input,manifest:{...overlapManifest,excluded_unready_test_paths:[excluded]},
  sourceObjectAt:testObjectAt,
  stagedCommitChangedPaths:[...input.stagedCommitChangedPaths,excluded]};
 assert.deepEqual(validateReadyOnlyCandidate(queue,withTest).excluded_unready_test_paths,[excluded]);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...withTest,
  sourceObjectAt:(sha,path)=>path===excluded&&sha===C?'test accidentally included':testObjectAt(sha,path)}),
  /Excluded test must be newly introduced and absent/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...withTest,
  manifest:{...withTest.manifest,excluded_unready_test_paths:['tests/issue999-untracked.test.mjs']}}),
  /does not belong to a frozen unselected READY or unfinished mixed-source item/);
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...withTest,
  stagedCommitChangedPaths:input.stagedCommitChangedPaths}),/staging commit changes unrelated paths/);
});


test('isolated owner release excludes ONLY exact new tests of unselected frozen READY source',()=>{
 const scanner={...one,id:'DIC-Q-102',issue:102,title:'separate READY scanner',
  merged_source_sha:B,scope_paths:['src/server/extractor.mjs']};
 const frozen={...q,items:[one,unfinished,scanner]};
 const newTest='tests/coffee-issue102-new-scanner.test.mjs';
 const objectAt=(sha,path)=>path===newTest?(sha===B?'scanner-test-blob':null):
  path.startsWith('tests/coffee-issue102-')?null:validate.sourceObjectAt(sha,path);
 const input={...validate,liveQueue:frozen,
  manifest:{...manifest,excluded_unready_test_paths:[newTest]},
  sourceObjectAt:objectAt,stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,newTest]};
 const accepted=validateReadyOnlyCandidate(frozen,input);
 assert.deepEqual(accepted.excluded_unready_test_paths,[newTest]);
 assert.deepEqual(accepted.ready_items.map(x=>x.id),[one.id]);
 assert.throws(()=>validateReadyOnlyCandidate(frozen,{...input,
  sourceObjectAt:(sha,path)=>path===newTest&&sha===C?'leaked test':objectAt(sha,path)}),
  /Excluded test must be newly introduced and absent/);
 assert.throws(()=>validateReadyOnlyCandidate({...frozen,
  items:[one,unfinished,{...scanner,merged_source_sha:A}]},input),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology|Excluded test does not belong/);
 assert.throws(()=>validateReadyOnlyCandidate(frozen,{...input,
  liveQueue:{...frozen,items:[one,unfinished,{...scanner,title:'unreviewed mutation'}]}}),
  /Additional READY source not proven post-staging|Cannot certify additional READY source chronology|Excluded test does not belong/);
 assert.throws(()=>validateReadyOnlyCandidate(frozen,{...input,
  manifest:{...input.manifest,excluded_unready_test_paths:['tests/coffee-issue102-unrelated.test.mjs']}}),
  /Excluded test does not belong/);
});

test('unready same-file overlap blocks even if another READY item covers the path',()=>{
 const overlapping={...unfinished,scope_paths:['site/card.js']};
 const p=planReadyOnlyCandidate({...q,items:[one,overlapping]},opts);
 assert.equal(p.ready,false);
 assert.match(p.errors.join(' '),/overlap/);
});
test('#3347 unmerged tracked overlap does not create a false READY publication pin',()=>{
 const neverMerged={...unfinished,id:'DIC-Q-103',issue:103,
  merged_source_sha:null,scope_paths:['site/card.js']};
 const sameFrozen=(ref,path)=>path==='site/card.js'?
  (ref===B||ref===D?'100644:'+'e'.repeat(40):'100644:'+'a'.repeat(40)):null;
 const input={...opts,sourceObjectAt:sameFrozen};
 const planned=planReadyOnlyCandidate({...q,items:[one,unfinished,neverMerged]},input);
 assert.equal(planned.ready,true,planned.errors.join('; '));
 assert.deepEqual(planned.pinned_ready_paths,[]);
 const drift=planReadyOnlyCandidate({...q,items:[one,unfinished,neverMerged]},{
  ...input,sourceObjectAt:(ref,path)=>ref===B&&path==='site/card.js'?
   '100644:'+'f'.repeat(40):sameFrozen(ref,path)});
 assert.equal(drift.ready,false,'actual unready byte drift still requires explicit pin');
 assert.match(drift.errors.join('; '),/overlap/);
 assert.equal(planReadyOnlyCandidate({...q,items:[one,unfinished,neverMerged]},opts).ready,false,
  'missing exact object reader must never waive overlap');
});
test('#3347 actual merged unready overlapping READY source still HOLDs until pinned',()=>{
 const merged={...unfinished,id:'DIC-Q-103',issue:103,
  merged_source_sha:D,scope_paths:['site/card.js']};
 const overlap={...q,items:[one,unfinished,merged]};
 const denied=planReadyOnlyCandidate(overlap,opts);
 assert.equal(denied.ready,false);
 assert.match(denied.errors.join('; '),/overlap/);
 const explicit=planReadyOnlyCandidate(overlap,{...opts,pinnedReadyPaths:['site/card.js']});
 assert.equal(explicit.ready,true,explicit.errors.join('; '));
 assert.deepEqual(explicit.pinned_ready_paths,['site/card.js']);
 const unknowable=planReadyOnlyCandidate(overlap,{...opts,isAncestor:(x,y)=>{
  if(x===D&&y===B)throw Error('missing remote object');
  return ancestor(x,y);
 }});
 assert.equal(unknowable.ready,false);
 assert.match(unknowable.errors.join('; '),/ancestry unavailable/);
});
test('unselected READY overlap and unknown paths cannot be silently included',()=>{
 const other={...one,id:'DIC-Q-102',issue:102,state:'READY',scope_paths:['site/card.js']};
 assert.equal(planReadyOnlyCandidate({...q,items:[one,unfinished,other]},opts).ready,false);
 assert.equal(planReadyOnlyCandidate(q,{...opts,developmentChangedPaths:[...opts.developmentChangedPaths,'netlify/functions/new.js']}).ready,false);
});
test('no READY item, stale baseline, duplicates, absent merge and unready selection all deny staging',()=>{
 for(const change of [
  {...opts,selectedIds:[]},{...opts,selectedIds:[one.id,one.id]},
  {...opts,publishedSourceSha:C},{...opts,selectedIds:[unfinished.id]}
 ])assert.equal(planReadyOnlyCandidate(q,change).ready,false);
 assert.equal(planReadyOnlyCandidate({...q,items:[{...one,merged_source_sha:null},unfinished]},opts).ready,false);
});
test('candidate must be bound to selected exact development parent, HEAD, tree and queue',()=>{
 const mutation=[
  {actualParents:[C,A]},{actualParents:[C,B,A]},
  {developmentDriftPaths:['site/new.js']},
  {queueContentMatches:false},{candidateChangedPaths:['site/card.js','src/server/extractor.mjs']},
  {candidateChangedPaths:[]},
  {stagedCommitChangedPaths:[CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH,'src/server/extractor.mjs','package.json']},
  {manifest:{...manifest,restored_to_published_paths:[]}},
  {manifest:{...manifest,candidate_branch:'release-candidates/another'}},
  {manifest:{...manifest,development_source_sha:A}},
  {candidateBranch:'main'},
  {sourceObjectAt:(sha,path)=>path==='src/server/extractor.mjs'?(sha===C?'unready':'published'):'new'}
 ];
 for(const change of mutation)assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,...change}),/candidate HOLD/,JSON.stringify(change));
});
test('candidate with unknown/dangling ancestry or changed READY file is rejected',()=>{
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,isAncestor:()=>false}),/candidate HOLD/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  sourceObjectAt:(sha,path)=>path==='site/card.js'&&sha===C?'tampered':validate.sourceObjectAt(sha,path)}),/candidate HOLD/);
});

test('later untracked edits in same READY path are never laundered into release',()=>{
 const bad= {...validate,sourceObjectAt:(sha,path)=>
  path==='site/card.js'&&sha===D?'different READY merged blob':
   validate.sourceObjectAt(sha,path)};
 assert.throws(()=>validateReadyOnlyCandidate(q,bad),/edits after its verified READY merge/);
});

test('a READY merge already in published candidate ancestry can still be unshipped',()=>{
 // First READY-only release excludes D's bytes while retaining the Git merge
 // as an ancestor. After a no-source-change integration merge, a later
 // publication must use the selected source blobs, not merge recency.
 const P='e'.repeat(40);
 const queue={...q,published_base:{...q.published_base,tested_source_sha:P}};
 const beforePublished=(x,y)=>x===y||
  (x===D&&(y===P||y===B))||(x===P&&y===B);
 const input={...opts,publishedSourceSha:P,isAncestor:beforePublished};
 const plan=planReadyOnlyCandidate(queue,input);
 assert.equal(plan.ready,true,plan.errors.join('; '));
 assert.deepEqual(plan.included_paths,['site/card.js']);
 assert.deepEqual(plan.restored_paths,['src/server/extractor.mjs']);
 // The source must still have a real unpublished file delta; a READY label
 // alone never authorizes a redundant build or already published bytes.
 assert.equal(planReadyOnlyCandidate(queue,{...input,developmentChangedPaths:[]}).ready,false);
 assert.equal(planReadyOnlyCandidate(queue,{...input,isAncestor:(a,b)=>a===b||(a===P&&b===B)}).ready,false);
});


test('excluded unfinished issue test inherited unchanged by later selected READY merge is not an approved READY test',()=>{
 const other={...unfinished,id:'DIC-Q-102',issue:102,state:'TESTING',scope_paths:['site/card.js']};
 const queue={...q,items:[one,unfinished,other]};
 const excluded='tests/issue102-unfinished-source.test.mjs';
 const customManifest={...manifest,pinned_to_ready_paths:['site/card.js'],
  excluded_unready_test_paths:[excluded]};
 const runtime=(ref,path)=>path==='site/card.js'?
  (ref===A?'published':ref===B?'unready-mixed':'approved-ready'):
  (ref===B?'unfinished':'published');
 const testBlobAt=(ref,path)=>{
  if(path===excluded)return [B,D,D+'^'].includes(ref)?'older-unready-test':null;
  return runtime(ref,path);
 };
 const settings={...validate,manifest:customManifest,
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,'site/card.js',excluded],
  sourceObjectAt:testBlobAt};
 const actual=validateReadyOnlyCandidate(queue,settings);
 assert.deepEqual(actual.excluded_unready_test_paths,[excluded]);
 // The selected READY commit explicitly introduces the test: never omit it.
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...settings,
  sourceObjectAt:(ref,path)=>ref===D+'^'&&path===excluded?null:testBlobAt(ref,path)}),
  /test introduced or modified by an approved READY merge/);
 // The selected READY commit changes the inherited test: never omit it.
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...settings,
  sourceObjectAt:(ref,path)=>ref===D+'^'&&path===excluded?'different-earlier-blob':testBlobAt(ref,path)}),
  /test introduced or modified by an approved READY merge/);
 // Parent lookup uncertainty must fail closed; do not infer prior Git bytes.
 assert.throws(()=>validateReadyOnlyCandidate(queue,{...settings,
  sourceObjectAt:(ref,path)=>{
   if(ref===D+'^'&&path===excluded)throw Error('missing historical parent');
   return testBlobAt(ref,path);
  }}),/Cannot independently verify selected READY test provenance/);
});

test('production candidate restores every development-only Actions workflow without weakening app READY scope',()=>{
 const path='.github/workflows/issue33-extra.yml';
 const original=validate.sourceObjectAt;
 const blob=(ref,p)=>p===path?(ref===B?'100644:development-workflow':null):original(ref,p);
 const withWorkflows={...validate,
  manifest:{...manifest,restored_unpublished_workflow_paths:[path]},
  developmentChangedPaths:[...validate.developmentChangedPaths,path],
  candidateChangedPaths:[...validate.candidateChangedPaths],
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,path],
  sourceObjectAt:blob};
 assert.equal(validateReadyOnlyCandidate(q,withWorkflows).ready,true);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...withWorkflows,
  manifest:{...manifest,restored_unpublished_workflow_paths:[]}}),
  /restore every changed GitHub Actions workflow/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...withWorkflows,
  candidateChangedPaths:[...validate.candidateChangedPaths,path]}),
  /must not modify\/create GitHub Actions workflows/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...withWorkflows,
  sourceObjectAt:(ref,p)=>ref===C&&p===path?'100644:unreviewed-workflow':blob(ref,p)}),
  /must not modify\/create GitHub Actions workflows|not exactly restored/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...withWorkflows,
  stagedCommitChangedPaths:validate.stagedCommitChangedPaths}),
  /staging commit changes unrelated paths/);
});

test('byte-pinned workflow-only browser-install test is excluded solely when its workflow is restored',()=>{
 const path='tests/issue455-browser-dependency-install-fallback.test.mjs';
 const workflow='.github/workflows/cloud-regression.yml';
 const testSha='100644:32174be8c42ba9ae73085e0f6f1f42613b2b08db';
 const objectAt=(ref,p)=>{
  if(p===path)return ref===A||ref===C?null:testSha;
  if(p===workflow)return ref===A||ref===C?'100644:published-workflow':'100644:new-workflow';
  return validate.sourceObjectAt(ref,p);
 };
 const inputs={...validate,
  manifest:{...manifest,restored_unpublished_workflow_paths:[workflow],
   excluded_unpublished_workflow_test_paths:[path]},
  sourceObjectAt:objectAt,
  developmentChangedPaths:[...validate.developmentChangedPaths,workflow],
  candidateChangedPaths:[...validate.candidateChangedPaths],
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,workflow,path]};
 assert.equal(validateReadyOnlyCandidate(q,inputs).ready,true);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...inputs,
  sourceObjectAt:(ref,p)=>ref===B&&p===path?'100644:changed-unreviewed-test':objectAt(ref,p)}),
  /Only one byte-pinned, reviewed workflow-only test/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...inputs,
  sourceObjectAt:(ref,p)=>ref===C&&p===path?testSha:objectAt(ref,p)}),
  /Workflow-only test exclusion source\/blob\/absence mismatch/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...inputs,
  sourceObjectAt:(ref,p)=>ref===D+'^'&&p===path?null:objectAt(ref,p)}),
  /Selected READY merge introduced or modified a workflow-only test/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...inputs,
  manifest:{...inputs.manifest,restored_unpublished_workflow_paths:[]}}),
  /restore every changed GitHub Actions workflow/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...inputs,
  manifest:{...inputs.manifest,excluded_unpublished_workflow_test_paths:['tests/issue999-arbitrary.test.mjs']}}),
  /Only one byte-pinned, reviewed workflow-only test/);
});


test('#2169 reviewed workflow-only test exclusion is pinned to actual source',()=>{
 const t=REVIEWED_WORKFLOW_TEST;
 assert.equal(t.sourceBlob,'32174be8c42ba9ae73085e0f6f1f42613b2b08db');
 const objectAt=(sha,path)=>sha===B&&path===t.path?'100644:'+t.sourceBlob:null;
 const opts={publishedSourceSha:A,developmentSourceSha:B,
  restoredWorkflows:[t.restoredWorkflow],sourceObjectAt:objectAt};
 assert.deepEqual(discoverReviewedWorkflowTestExclusions(opts),[t.path]);
 assert.deepEqual(discoverReviewedWorkflowTestExclusions({...opts,restoredWorkflows:[]}),[]);
 assert.deepEqual(discoverReviewedWorkflowTestExclusions({...opts,
  sourceObjectAt:(sha,path)=>sha===B&&path===t.path?'100644:'+'a'.repeat(40):null}),[]);
 assert.deepEqual(discoverReviewedWorkflowTestExclusions({...opts,
  sourceObjectAt:(sha,path)=>sha===A&&path===t.path?'100644:'+'b'.repeat(40):objectAt(sha,path)}),[]);
});

test('#2169 unready newly introduced tests are omitted only with fully restored runtime',()=>{
 const p='tests/issue101-unready.test.mjs';
 const obj=(ref,path)=>path===p?(ref===B?'100644:'+'f'.repeat(40):null):validate.sourceObjectAt(ref,path);
 const opts={queue:q,selectedIds:[one.id],restoredPaths:['src/server/extractor.mjs'],
  publishedSourceSha:A,developmentSourceSha:B,changedPaths:[p],sourceObjectAt:obj};
 assert.deepEqual(discoverExcludedUnreadyTests(opts),[p]);
 assert.deepEqual(discoverExcludedUnreadyTests({...opts,restoredPaths:[]}),[]);
 const manifest2={...manifest,excluded_unready_test_paths:[p]};
 const v={...validate,manifest:manifest2,sourceObjectAt:obj,
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,p]};
 assert.equal(validateReadyOnlyCandidate(q,v).ready,true);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...v,
  sourceObjectAt:(ref,path)=>ref===C&&path===p?'100644:leak':obj(ref,path)}),/Excluded test must be newly introduced/);
 assert.deepEqual(discoverExcludedUnreadyTests({...opts,
  sourceObjectAt:(ref,path)=>ref===D&&path===p?'100644:selected':obj(ref,path)}),[]);
 assert.deepEqual(discoverExcludedUnreadyTests({...opts,
  sourceObjectAt:(ref,path)=>ref===A&&path===p?'100644:published':obj(ref,path)}),[]);
});

test('#2169 candidate checks static relative module existence before expensive build',()=>{
 const sources={'site/main.js':"import {push} from './push.js';\nexport {view} from './view.js';\n",
  'site/push.js':'export const push=1;','site/view.js':'export const view=1;'};
 const args={readSource:path=>sources[path],hasPath:path=>Object.hasOwn(sources,path)};
 assert.equal(assertCandidateRelativeImports(['site/main.js'],args),true);
 delete sources['site/view.js'];
 assert.throws(()=>assertCandidateRelativeImports(['site/main.js'],args),/Unresolved static relative module import/);
 assert.throws(()=>assertCandidateRelativeImports(['site/main.js'],{...args,readSource:()=>42}),/Cannot read candidate module/);
 assert.throws(()=>assertCandidateRelativeImports(['site/main.js'],{...args,readSource:()=> "import '../escape.js';"}),/Unresolved static relative module import|Unsafe relative module path/);
});
test('#2169 recorded candidate risk cannot differ from its selected app diff',()=>{
 const risk={tier:'high',checks:['approval'],builds:2,not_applicable:[]};
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  manifest:{...manifest,risk_classification:risk}}),/candidate risk-tier/);
});

test('#2169 missing or falsified risk receipt cannot bypass five-source-check classification',()=>{
 assert.equal(validateReadyOnlyCandidate(q,validate).ready,true);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  manifest:{...manifest,risk_classification:undefined}}),/risk-tier\/one-build/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  manifest:{...manifest,risk_classification:null}}),/risk-tier\/one-build/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  manifest:{...manifest,risk_classification:{...manifest.risk_classification,builds:0}}}),/risk-tier\/one-build/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...validate,
  manifest:{...manifest,risk_classification:{...manifest.risk_classification,checks:['approval']}}}),/risk-tier\/one-build/);
});

test('#2169 source-only export preflight denies missing direct symbols before build',()=>{
 const files={'site/main.js':"import { push, view as local } from './functions.js';\n",
  'site/functions.js':'export const push=1;\nexport {view} from "./view.js";',
  'site/view.js':'export const view=1;',
  'site/screen.js':'export default function screen(){}'};
 const args={readSource:path=>files[path],hasPath:path=>Object.hasOwn(files,path)};
 assert.equal(assertCandidateStaticNamedExports(['site/main.js'],args),true);
 files['site/functions.js']='export const wrong=1;';
 assert.throws(()=>assertCandidateStaticNamedExports(['site/main.js'],args),
  /Missing static relative module export.*push/);
 files['site/main.js']="import screen from './screen.js';";
 files['site/screen.js']='export const onlyNamed=1;';
 assert.throws(()=>assertCandidateStaticNamedExports(['site/main.js'],args),
  /Missing static relative module export.*default/);
});
test('#2169 unknown barrel export is deferred to mandatory build but missing file stops early',()=>{
 const files={'site/main.js':"import {value} from './barrel.js';",
  'site/barrel.js':"export * from './unknown.js';"};
 const args={readSource:path=>files[path],hasPath:path=>Object.hasOwn(files,path)};
 assert.equal(assertCandidateStaticNamedExports(['site/main.js'],args),true);
 files['site/main.js']="import {value} from './missing.js';";
 assert.throws(()=>assertCandidateStaticNamedExports(['site/main.js'],args),
  /Unresolved static relative module import/);
});
test('#2169 source staging and guarded controller use export preflight before CI/claim',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('scripts/release/stage-ready-only-candidate.mjs'),
  /assertCandidateStaticNamedExports\(plan\.included_paths/);
 assert.match(read('scripts/release/controlled-release-runner.mjs'),
  /assertCandidateStaticNamedExports\(queueGate\.deployable_paths/);
});


test('#2169 generator ESM exports pass frozen-source preflight, absent symbols still HOLD',()=>{
 const files={
  'site/main.js':"import {rawElements,streamElements,removeComments} from './html-scan.mjs';",
  'site/html-scan.mjs':"export function* rawElements(html){yield html;}\nexport async function * streamElements(html){yield html;}\nexport function removeComments(html){return html;}"
 };
 const args={readSource:path=>files[path],hasPath:path=>Object.hasOwn(files,path)};
 assert.equal(assertCandidateStaticNamedExports(['site/main.js'],args),true);
 files['site/main.js']="import {rawElements,missingSymbol} from './html-scan.mjs';";
 assert.throws(()=>assertCandidateStaticNamedExports(['site/main.js'],args),
  /Missing static relative module export.*missingSymbol/);
});

test('#3342 source-bound SQL test restoration retains published guard while excluding TESTING migration',()=>{
 const spec=REVIEWED_SOURCE_PATH_CASE_SQL_TEST;
 const pub='a'.repeat(40),dev='b'.repeat(40),chosen='c'.repeat(40);
 const source=new Map([
  [pub+':'+spec.path,'100644:'+spec.publishedBlob],
  [dev+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [spec.sourceMerge+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [spec.sourceMerge+'^:'+spec.path,'100644:'+spec.publishedBlob],
  [dev+':'+spec.migration,'100644:'+('d'.repeat(40))],
  [chosen+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [chosen+'^:'+spec.path,'100644:'+spec.unpublishedBlob]
 ]);
 const lookup=(ref,path)=>source.get(ref+':'+path)??null;
 const item={id:spec.itemId,issue:509,state:'TESTING',merged_source_sha:spec.sourceMerge,
  scope_paths:[spec.migration]};
 const args={queue:{items:[item]},restoredPaths:[spec.migration],
  publishedSourceSha:pub,developmentSourceSha:dev,sourceObjectAt:lookup,
  selectedReadyItems:[{id:'DIC-Q-1',merged_source_sha:chosen}]};
 assert.deepEqual(discoverReviewedRestoredSqlTests(args),[spec.path]);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,restoredPaths:[]}),/independently attributable/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,queue:{items:[{...item,state:'READY'}]}}),
  /independently attributable/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(ref,path)=>
  ref===pub&&path===spec.path?'100644:'+('e'.repeat(40)):lookup(ref,path)}),
  /published SQL identity test blob/i);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(ref,path)=>
  ref===chosen&&path===spec.path?'100644:'+('f'.repeat(40)):lookup(ref,path)}),
  /Selected READY merge modified/);
});

test('#3347 R232 TESTING runtime and its two complete published coffee tests stay paired',()=>{
 const s=REVIEWED_R232_COFFEE_TEST;
 const owner={id:s.item,issue:s.issue,state:'TESTING',
  merged_source_sha:null,scope_paths:[s.runtime]};
 const testObj=(ref,path)=>{
  if(path===s.runtime)return '100644:'+
   ([A,s.merge+'^'].includes(ref)?s.oldRuntime:s.newRuntime);
  const x=s.testBlobs[path];if(!x)return null;
  return '100644:'+([A,s.merge+'^',D,D+'^'].includes(ref)?x.old:x.newer);
 };
 const input={queue:{items:[owner]},restoredPaths:[s.runtime],
  publishedSourceSha:A,developmentSourceSha:B,
  sourceObjectAt:testObj,selectedReadyItems:[one]};
 assert.deepEqual(discoverReviewedRestoredR232CoffeeTests(input),Object.keys(s.testBlobs).sort());
 assert.deepEqual(discoverReviewedRestoredR232CoffeeTests({...input,restoredPaths:[]}),[]);
 assert.throws(()=>discoverReviewedRestoredR232CoffeeTests({...input,
  queue:{items:[{...owner,state:'READY'}]}}),/owner or runtime provenance/);
 assert.throws(()=>discoverReviewedRestoredR232CoffeeTests({...input,
  sourceObjectAt:(ref,path)=>ref===B&&path===Object.keys(s.testBlobs)[0]?
    '100644:'+'f'.repeat(40):testObj(ref,path)}),/historical test Git object changed/);
 assert.throws(()=>discoverReviewedRestoredR232CoffeeTests({...input,
  sourceObjectAt:(ref,path)=>ref===D&&path===Object.keys(s.testBlobs)[0]?
    '100644:'+'f'.repeat(40):testObj(ref,path)}),/Selected READY merge edited/);
});

test('#3342 frozen SQL suite restores only exact unpublished source-bound tests',()=>{
 const spec=REVIEWED_UNREADY_SQL_SUITE.find(i=>i.path.endsWith('/universal_url_preview.sql'));
 assert.ok(spec,'pin real existing test proof');
 const pub='a'.repeat(40),dev='b'.repeat(40),ready='c'.repeat(40);
 const m=new Map([
  [pub+':'+spec.path,'100644:'+spec.publishedBlob],
  [dev+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [spec.sourceMerge+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [spec.sourceMerge+'^:'+spec.path,'100644:'+('e'.repeat(40))],
  [dev+':'+spec.migration,'100644:'+('f'.repeat(40))],
  [ready+':'+spec.path,'100644:'+spec.unpublishedBlob],
  [ready+'^:'+spec.path,'100644:'+spec.unpublishedBlob]
 ]);
 const read=(r,path)=>m.get(r+':'+path)??null;
 const owner={id:'DIC-Q-509-test',issue:509,state:'TESTING',
  scope_paths:[spec.migration]};
 const args={queue:{items:[owner]},restoredPaths:[spec.migration],
  publishedSourceSha:pub,developmentSourceSha:dev,
  selectedReadyItems:[{id:'DIC-Q-33',merged_source_sha:ready}],sourceObjectAt:read};
 assert.deepEqual(discoverReviewedRestoredSqlTests(args),[spec.path]);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,
  sourceObjectAt:(r,path)=>r===pub&&path===spec.path?null:read(r,path)}),
  /Unreviewed current or published SQL test bytes/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,
  queue:{items:[{...owner,state:'READY'}]}}),
  /lacks exact source\/migration provenance/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,
  sourceObjectAt:(r,path)=>r===ready&&path===spec.path?'100644:'+('d'.repeat(40)):read(r,path)}),
  /Selected READY merge modified/);
});

test('#3347 only source-proven #509 unfinished Admin search restores full published test blob',()=>{
 const s=REVIEWED_UNREADY_ADMIN_TEST,ready='c'.repeat(40);
 const owner={id:s.owner,issue:509,state:'TESTING',scope_paths:[s.runtime]};
 const at=(ref,path)=>{
  if(path===s.runtime)return '100644:'+(ref===A?'a':'b').repeat(40);
  if(path!==s.path)return null;
  if(ref===A)return '100644:'+s.published;
  if(ref===B||ref===s.sourceMerge)return '100644:'+s.development;
  if(ref===s.sourceMerge+'^')return '100644:'+s.mergeParent;
  if(ref===ready||ref===ready+'^')return '100644:'+s.published;
  return null;
 };
 const opts={queue:{items:[owner]},restoredPaths:[s.runtime],publishedSourceSha:A,
  developmentSourceSha:B,sourceObjectAt:at,selectedReadyItems:[{id:'DIC-Q-ready',merged_source_sha:ready}]};
 assert.deepEqual(discoverReviewedRestoredUnreadyAdminTests(opts),[s.path]);
 assert.deepEqual(discoverReviewedRestoredUnreadyAdminTests({...opts,restoredPaths:[]}),[]);
 assert.throws(()=>discoverReviewedRestoredUnreadyAdminTests({...opts,
  queue:{items:[{...owner,state:'READY'}]}}),/Unready Admin test/);
 assert.throws(()=>discoverReviewedRestoredUnreadyAdminTests({...opts,
  sourceObjectAt:(ref,path)=>ref===B&&path===s.path?'100644:'+'f'.repeat(40):at(ref,path)}),/Unready Admin test/);
 assert.throws(()=>discoverReviewedRestoredUnreadyAdminTests({...opts,
  sourceObjectAt:(ref,path)=>ref===ready&&path===s.path?'100644:'+'f'.repeat(40):at(ref,path)}),/Selected READY merge modified/);
});
test('#3347 pinned READY coffee parser excludes exact new unready #33 R324 import test only',()=>{
 const s=REVIEWED_PINNED_COFFEE_TEST;
 const owner={id:'DIC-Q-33-test',issue:33,state:'TESTING',scope_paths:[s.runtime]};
 const at=(ref,path)=>{
  if(path===s.path)return ref===B||ref===s.merge?'100644:'+s.blob:null;
  if(path===s.runtime)return ref===s.merge?'100644:'+'e'.repeat(40):
   ref===s.merge+'^'?'100644:'+'f'.repeat(40):null;
  return null;
 };
 const opts={queue:{items:[owner]},selectedIds:[],restoredPaths:[],
  pinnedReadyPaths:[s.runtime],publishedSourceSha:A,developmentSourceSha:B,
  changedPaths:[s.path],sourceObjectAt:at};
 assert.deepEqual(discoverExcludedUnreadyTests(opts),[s.path]);
 assert.deepEqual(discoverExcludedUnreadyTests({...opts,pinnedReadyPaths:[]}),[]);
 assert.throws(()=>discoverExcludedUnreadyTests({...opts,
  queue:{items:[{...owner,state:'READY'}]}}),/pinned coffee test/);
 assert.throws(()=>discoverExcludedUnreadyTests({...opts,
  sourceObjectAt:(ref,path)=>ref===B&&path===s.path?'100644:'+'f'.repeat(40):at(ref,path)}),/pinned coffee test/);
});
test('#3347 #509 new SQL regression excluded only with its own TESTING migration',()=>{
 const spec=REVIEWED_UNREADY_SQL_SUITE.find(x=>x.path==='supabase/tests/admin_shot_delete_family_refresh.sql');
 assert.ok(spec);
 const owner={id:'DIC-Q-509-admin-shot-delete-family-refresh',issue:509,state:'TESTING',scope_paths:[spec.migration]};
 const at=(ref,path)=>{
  if(path===spec.migration)return ref===B?'100644:'+'f'.repeat(40):null;
  if(path!==spec.path)return null;
  if(ref===B||ref===spec.sourceMerge)return '100644:'+spec.unpublishedBlob;
  if(ref===spec.sourceMerge+'^')return '100644:'+'e'.repeat(40);
  return null;
 };
 const opts={queue:{items:[owner]},restoredPaths:[spec.migration],publishedSourceSha:A,
  developmentSourceSha:B,sourceObjectAt:at,selectedReadyItems:[{id:'DIC-Q-ready',merged_source_sha:C}]};
 assert.deepEqual(discoverReviewedRestoredSqlTests(opts),[spec.path]);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...opts,queue:{items:[{...owner,state:'READY'}]}}),/lacks exact source\/migration provenance/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...opts,
  sourceObjectAt:(ref,path)=>ref===B&&path===spec.path?'100644:'+'f'.repeat(40):at(ref,path)}),/Unreviewed current or published SQL test bytes/);
});


test('#3347 path-receipt equality ignores repeated proven expected ownership, never extra, missing, or duplicate actual paths',()=>{
 const published='site/cloud/main.js';
 const journal=CANDIDATE_JOURNAL_PATH;
 const receipt=CANDIDATE_RECEIPT_PATH;
 const expected=[published,receipt,journal,published];
 assert.equal(matchesCandidateChangedPaths([published,receipt,journal],expected),true,
  'two independently proven restore categories can own the same exact changed file');
 for(const unexpected of [
  [published,journal],
  [published,receipt,journal,'site/private.js'],
  [published,published,receipt,journal],
  [published,receipt,journal,receipt]
 ])assert.equal(matchesCandidateChangedPaths(unexpected,expected),false,
  'missing, unexpected, and duplicate actual Git paths still HOLD');
 assert.equal(matchesCandidateChangedPaths(null,expected),false);
 assert.equal(matchesCandidateChangedPaths([],expected),false);
});
