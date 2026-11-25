import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {planReadyOnlyCandidate,validateReadyOnlyCandidate,assertExactCandidateStagedPaths,CANDIDATE_KIND,
 CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH,REVIEWED_WORKFLOW_TEST,REVIEWED_CI_FAST_PR_TEST,discoverReviewedWorkflowTestExclusions,discoverExcludedUnreadyTests,assertCandidateRelativeImports,
 assertCandidateStaticNamedExports,discoverReviewedRestoredSqlTests,REVIEWED_SOURCE_PATH_CASE_SQL_TEST,REVIEWED_UNREADY_SQL_SUITE,discoverReviewedRestoredR232CoffeeTests,REVIEWED_R232_COFFEE_TEST,discoverReviewedRestoredUnreadyAdminTests,REVIEWED_UNREADY_ADMIN_TEST,discoverReviewedRestoredStartupTests,REVIEWED_STARTUP_MIXED_TESTS,REVIEWED_PINNED_COFFEE_TEST} from '../scripts/release/ready-only-candidate.mjs';
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
test('#3347 overlapping workflow-only and unfinished-test path is counted once, never waived',()=>{
 const duplicate=REVIEWED_WORKFLOW_TEST.path;
 const groups=[
  ['site/unfinished.js'],[duplicate],[duplicate],
  [CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH]
 ];
 const actual=[...new Set(groups.flat())];
 assert.equal(assertExactCandidateStagedPaths(actual,...groups),true);
 assert.throws(()=>assertExactCandidateStagedPaths(actual.filter(p=>p!==duplicate),...groups),
  /staging commit changes unrelated paths/,'missing test must still fail closed');
 assert.throws(()=>assertExactCandidateStagedPaths([...actual,'site/unrelated.js'],...groups),
  /staging commit changes unrelated paths/,'untracked source must still fail closed');
 assert.throws(()=>assertExactCandidateStagedPaths([...actual,duplicate],...groups),
  /staging commit changes unrelated paths/,'duplicate actual diff must be rejected');
});
test('#3347 startup coupled Log Shot suites use only proven published-source test blobs',()=>{
 const s=REVIEWED_STARTUP_MIXED_TESTS;
 const selected={...one,id:s.id,issue:455,state:'READY',merged_source_sha:s.merge,
  scope_paths:[s.runtime,'build_cloud.mjs','site/cloud/startup-recovery.js']};
 const unready={...unfinished,id:'DIC-Q-455-r381-copy-control',issue:455,
  state:'TESTING',scope_paths:[s.runtime]};
 const queue={...q,items:[selected,unready]};
 const objects=new Map([
  [s.merge+':'+s.runtime,'100644:'+s.cleanRuntime],
  [B+':'+s.runtime,'100644:'+'f'.repeat(40)]
 ]);
 for(const item of s.tests){
  objects.set(A+':'+item.path,'100644:'+item.published);
  objects.set(B+':'+item.path,'100644:'+item.unready);
  objects.set(s.merge+':'+item.path,'100644:'+item.published);
  objects.set(s.merge+'^:'+item.path,'100644:'+item.unready);
 }
 const sourceObjectAt=(ref,path)=>objects.get(ref+':'+path)??null;
 const props={queue,pinnedReadyPaths:[s.runtime],publishedSourceSha:A,
  developmentSourceSha:B,sourceObjectAt,selectedReadyItems:[selected]};
 assert.deepEqual(discoverReviewedRestoredStartupTests(props),s.tests.map(x=>x.path).sort());
 const audit=s.tests.find(x=>x.path==='scripts/audit/issue33-original603-focused-source-review.mjs');
 const publishedAtSource=(ref,path)=>path===audit.path&&ref===B?
  '100644:'+audit.published:
  path===audit.path&&ref===s.merge?'100644:'+audit.unready:sourceObjectAt(ref,path);
 const once=discoverReviewedRestoredStartupTests({...props,sourceObjectAt:publishedAtSource});
 assert.deepEqual(once,s.tests.filter(x=>x.path!==audit.path).map(x=>x.path).sort(),
  'already exact-published source must not be counted as a changed-path restoration');
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,sourceObjectAt:(ref,path)=>
  path===audit.path&&ref===s.merge+'^'?'100644:'+'2'.repeat(40):publishedAtSource(ref,path)}),
  /changed already-published audit\/test/);
 const compact={id:selected.id,issue:selected.issue,title:selected.title,
  merged_source_sha:selected.merged_source_sha,scope_paths:selected.scope_paths};
 assert.deepEqual(discoverReviewedRestoredStartupTests({...props,selectedReadyItems:[compact]}),
  s.tests.map(x=>x.path).sort(),
  'planner omits state; the actual queue is the READY authority');
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,
  selectedReadyItems:[compact],queue:{...queue,items:[{...selected,state:'TESTING'},unready]}}),
  /mixed-file provenance/,'TESTING queue fails closed despite matching source identity');
 assert.deepEqual(discoverReviewedRestoredStartupTests({...props,selectedReadyItems:[]}),[]);
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,pinnedReadyPaths:[]}),
  /mixed-file provenance/);
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,queue:{...queue,items:[selected]}}),
  /mixed-file provenance/);
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,sourceObjectAt:(ref,path)=>
  ref===B&&path===s.tests[0].path?'100644:'+'0'.repeat(40):sourceObjectAt(ref,path)}),
  /unreviewed Git blob/);
 assert.throws(()=>discoverReviewedRestoredStartupTests({...props,sourceObjectAt:(ref,path)=>
  ref===s.merge+'^'&&path===s.tests[1].path?'100644:'+'1'.repeat(40):sourceObjectAt(ref,path)}),
  /first-parent drift/);
});
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


test('#3347 strict candidate accepts second reviewed CI workflow-only test without accepting drift',()=>{
 const spec=REVIEWED_CI_FAST_PR_TEST;
 const path=spec.path,workflow=spec.restoredWorkflow,testSha='100644:'+spec.sourceBlob;
 const objectAt=(ref,p)=>{
  if(p===path)return ref===A||ref===C?null:testSha;
  if(p===workflow)return ref===A||ref===C?'100644:published-workflow':'100644:new-workflow';
  return validate.sourceObjectAt(ref,p);
 };
 const args={...validate,
  manifest:{...manifest,restored_unpublished_workflow_paths:[workflow],
   excluded_unpublished_workflow_test_paths:[path]},
  sourceObjectAt:objectAt,
  developmentChangedPaths:[...validate.developmentChangedPaths,workflow],
  candidateChangedPaths:[...validate.candidateChangedPaths],
  stagedCommitChangedPaths:[...validate.stagedCommitChangedPaths,workflow,path]};
 assert.equal(validateReadyOnlyCandidate(q,args).ready,true);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...args,
  sourceObjectAt:(ref,p)=>ref===C&&p===path?testSha:objectAt(ref,p)}),
  /Workflow-only test exclusion source\/blob\/absence mismatch/);
 assert.throws(()=>validateReadyOnlyCandidate(q,{...args,
  sourceObjectAt:(ref,p)=>ref===D+'^'&&p===path?null:objectAt(ref,p)}),
  /Selected READY merge introduced or modified a workflow-only test/);
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
 // The exact R232 PR #2940 was independently verified merged in development.
 // A truthful queue provenance correction cannot disable published test pairing.
 assert.deepEqual(discoverReviewedRestoredR232CoffeeTests({...input,
  queue:{items:[{...owner,merged_source_sha:s.merge}]} }),Object.keys(s.testBlobs).sort());
 assert.throws(()=>discoverReviewedRestoredR232CoffeeTests({...input,
  queue:{items:[{...owner,merged_source_sha:'f'.repeat(40)}]}}),/owner or runtime provenance/);

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
test('#3347 preserves five full published startup source-coupled suites',()=>{
 const s=REVIEWED_STARTUP_MIXED_TESTS;
 assert.equal(s.tests.length,6,'five original tests and full published original603 audit');
 assert.equal(s.tests.filter(x=>x.path.startsWith('tests/')).length,5);
 assert.equal(s.tests.find(x=>x.path==='scripts/audit/issue33-original603-focused-source-review.mjs')?.published,'49b50fa3c1a1a07e61943ad98bbb2cc31c119fac');
 assert.ok(s.tests.every(x=>/^[a-f0-9]{40}$/.test(x.published)&&/^[a-f0-9]{40}$/.test(x.unready)));
});
test('#3347 new CI-only regression is excluded only with its exact restored original workflow',()=>{
 const spec=REVIEWED_CI_FAST_PR_TEST;
 const at=(r,p)=>r===B&&p===spec.path?'100644:'+spec.sourceBlob:null;
 const args={publishedSourceSha:A,developmentSourceSha:B,
  restoredWorkflows:[spec.restoredWorkflow],sourceObjectAt:at};
 assert.deepEqual(discoverReviewedWorkflowTestExclusions(args),[spec.path]);
 assert.deepEqual(discoverReviewedWorkflowTestExclusions({...args,restoredWorkflows:[]}),[]);
 assert.deepEqual(discoverReviewedWorkflowTestExclusions({...args,
  sourceObjectAt:(r,p)=>r===B&&p===spec.path?'100644:'+'f'.repeat(40):at(r,p)}),[]);
});
test('#3347 new unready coffee R324 test follows restored parser source, not only pinned source',()=>{
 const spec=REVIEWED_PINNED_COFFEE_TEST;
 const at=(r,p)=>p===spec.path?(r===B||r===spec.merge?'100644:'+spec.blob:null):
  p===spec.runtime?(r===B?'100644:'+'e'.repeat(40):
   r===spec.merge?'100644:'+'f'.repeat(40):
   r===spec.merge+'^'?'100644:'+'a'.repeat(40):null):null;
 const args={queue:{items:[{id:'DIC-Q-33-unready-review',issue:33,state:'TESTING',
   scope_paths:[spec.runtime]}]},selectedIds:[],restoredPaths:[spec.runtime],
   pinnedReadyPaths:[],publishedSourceSha:A,developmentSourceSha:B,
   changedPaths:[spec.path],sourceObjectAt:at};
 assert.deepEqual(discoverExcludedUnreadyTests(args),[spec.path]);
 assert.deepEqual(discoverExcludedUnreadyTests({...args,restoredPaths:[]}),[]);
});
test('#3347 two new independent SQL tests are absent only when their unready owning migrations are restored',()=>{
 for(const name of ['admin_account_delete_completed_receipt.sql','personal_family_refresh_single_pass_post.sql']){
  const spec=REVIEWED_UNREADY_SQL_SUITE.find(x=>x.path==='supabase/tests/'+name);
  assert.ok(spec,'reviewed SQL migration/test pair exists');
  assert.equal(spec.publishedBlob,null,'not in last-published SQL suite');
  assert.match(spec.unpublishedBlob,/^[a-f0-9]{40}$/);
  assert.match(spec.sourceMerge,/^[a-f0-9]{40}$/);
  const owner={id:'DIC-Q-509-review',issue:509,state:'TESTING',scope_paths:[spec.migration]};
  const at=(r,p)=>{
   if(p===spec.path)return r===B||r===spec.sourceMerge?'100644:'+spec.unpublishedBlob:null;
   if(p===spec.migration)return r===B?'100644:'+'f'.repeat(40):null;
   return null;
  };
  const args={queue:{items:[owner]},restoredPaths:[spec.migration],
   publishedSourceSha:A,developmentSourceSha:B,selectedReadyItems:[{id:'DIC-Q-1',merged_source_sha:C}],
   sourceObjectAt:at};
  assert.deepEqual(discoverReviewedRestoredSqlTests(args),[spec.path]);
  assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(r,p)=>
   r===B&&p===spec.path?'100644:'+'e'.repeat(40):at(r,p)}),
   /Unreviewed current or published SQL test bytes/);
 }
});
test('#3347 unpublished PageFly audit helper excluded only with exact R374 scope and reviewed source blob',()=>{
 const path='scripts/audit/issue33-r374-original41-check.mjs';
 const runtime='src/server/coffee-pagefly-selected-h3.mjs';
 const scope=['src/server/coffee-decaffeination-method.mjs',
  'src/server/coffee-direct-product-prose.mjs',runtime];
 const owner={id:'DIC-Q-33-r374-original41-selected-pagefly-sugarcane-method',
  issue:33,state:'TESTING',scope_paths:scope};
 const chosen={id:REVIEWED_STARTUP_MIXED_TESTS.id,merged_source_sha:REVIEWED_STARTUP_MIXED_TESTS.merge};
 const blob='6b47cfa4736189d91df71ed6867f9455065ce4b3';
 const at=(r,p)=>p===path?(r===B||r===chosen.merged_source_sha||r===chosen.merged_source_sha+'^'?'100644:'+blob:null):
  p===runtime?(r===B?'100644:'+'f'.repeat(40):null):null;
 const args={queue:{items:[owner,chosen]},selectedIds:[chosen.id],
  restoredPaths:scope,pinnedReadyPaths:['site/cloud/main.js'],
  publishedSourceSha:A,developmentSourceSha:B,changedPaths:[path],sourceObjectAt:at};
 assert.deepEqual(discoverExcludedUnreadyTests(args),[path]);
 assert.deepEqual(discoverExcludedUnreadyTests({...args,restoredPaths:[]}),[]);
 assert.deepEqual(discoverExcludedUnreadyTests({...args,sourceObjectAt:(r,p)=>
  r===B&&p===path?'100644:'+'0'.repeat(40):at(r,p)}),[]);
});


test('#3889 prospective READY path requires exact reviewed source, 63-ID original baseline and nonpublishing state',async()=>{
 const {reviewedProspectiveReadyQueuePath}=await import('../scripts/release/ready-only-candidate.mjs');
 const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40);
 const id='DIC-Q-509-stale-project-shot-comment-20261122';
 const branch='release-candidates/prospect3889-'+'f'.repeat(20);
 const manifest={publication_authorized:false,candidate_branch:branch,
  selected_ready_item_ids:[id],prospective_ready_preview:{
   status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
   baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
   selected_id:id,identity_sha256:'e'.repeat(64)}};
 const queue={items:[{id,state:'READY'}]};
 const opts={manifest,queue,developmentSourceSha:A,candidateSha:B,candidateBranch:branch,
  sourceObjectAt:(sha,path)=>path==='docs/RELEASE_QUEUE.json'?sha===A?'100644:'+C:'100644:'+B:null};
 assert.deepEqual(reviewedProspectiveReadyQueuePath({...opts,manifest:{}}),[]);
 assert.deepEqual(reviewedProspectiveReadyQueuePath(opts),['docs/RELEASE_QUEUE.json']);
 const edits=[
  x=>{x.manifest.publication_authorized=true},
  x=>{x.manifest.selected_ready_item_ids=[]},
  x=>{x.manifest.prospective_ready_preview.identity_sha256='fake'},
  x=>{x.manifest.prospective_ready_preview.baseline_queue_blob='f'.repeat(40)},
  x=>{x.queue.items[0].state='TESTING'},
  x=>{x.candidateBranch='release-candidates/ready3347-'+'f'.repeat(20)},
  x=>{x.sourceObjectAt=()=>null},
  x=>{x.sourceObjectAt=()=> '100644:'+C},
 ];
 for(const edit of edits){const x=structuredClone({manifest,queue,developmentSourceSha:A,candidateSha:B,candidateBranch:branch});x.sourceObjectAt=opts.sourceObjectAt;edit(x);assert.throws(()=>reviewedProspectiveReadyQueuePath(x),/HOLD/);}
});


test('#3889 prospective promotion requires actual byte-identical live READY queue and only the original selected row changes',async()=>{
 const {reviewedProspectivePromotionQueueParity:parity}=await import('../scripts/release/ready-only-candidate.mjs');
 const id='DIC-Q-509-stale-project-shot-comment-20261122';
 const item={id,issue:509,title:'Scoped source',state:'TESTING',
  owner_source:'https://github.com/Schulzet3/The-Dial-In-Collective/issues/509',
  merged_source_sha:'a'.repeat(40),
  scope_paths:['supabase/migrations/20261122214500_dic_project_shot_comment_refresh.sql'],
  tests:['PASS'],ci_runs:[1],blockers:['candidate pending']};
 const source={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:'2d22d448160d428a977f06482323646b92818fcf',
   release_sha:'5b256f1fc0717d3635f7148b934a1f91f8991685',netlify_deploy_id:'deployment'},
  items:[item],history:[]};
 const proposed=structuredClone(source);proposed.items[0].state='READY';proposed.items[0].blockers=[];
 const raw=JSON.stringify(source),ready=JSON.stringify(proposed);
 const manifest={kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  published_source_sha:source.published_base.tested_source_sha,
  development_source_sha:'544b06558ab9ab6df4eea0410277b1a3c19f2fe4',
  candidate_branch:'release-candidates/prospect3889-544b06558ab9ab6df4ee',
  selected_ready_item_ids:[id],prospective_ready_preview:{
   status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
   selected_id:id,baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4'}};
 const args={manifest,originalQueue:raw,candidateQueue:ready,liveQueue:ready};
 assert.equal(parity(args),true);
 assert.equal(parity({...args,liveQueue:raw}),false,'unpromoted TESTING is never publisher eligible');
 assert.equal(parity({...args,liveQueue:ready+' '}),false,'not even whitespace drift is allowed');
 assert.equal(parity({...args,manifest:{...manifest,publication_authorized:true}}),false);
 assert.equal(parity({...args,manifest:{...manifest,prospective_ready_preview:{
  ...manifest.prospective_ready_preview,baseline_queue_blob:'0'.repeat(40)}}}),false);
 assert.equal(parity({...args,manifest:{...manifest,selected_ready_item_ids:[]}}),false);
 const injected=structuredClone(proposed);injected.items[0].title='Unreviewed changed title';
 assert.equal(parity({...args,candidateQueue:JSON.stringify(injected),liveQueue:JSON.stringify(injected)}),false);
 const second={...item,id:'DIC-Q-509-other',state:'TESTING'};const mutated=structuredClone(proposed);
 mutated.items.push(second);
 assert.equal(parity({...args,candidateQueue:JSON.stringify(mutated),liveQueue:JSON.stringify(mutated)}),false);
 assert.equal(parity({...args,originalQueue:ready,candidateQueue:ready}),true,
  'ordinary same-queue contract remains unchanged');
});

test('#3889 exact seven excluded QA paths must match published Git blobs and two merged QA fixes',async()=>{
 const {reviewedProspectiveQaRestorationPaths:prove}=await import('../scripts/release/ready-only-candidate.mjs');
 const published='2d22d448160d428a977f06482323646b92818fcf',
  development='544b06558ab9ab6df4eea0410277b1a3c19f2fe4',
  candidate='16bc481b2c66c5229c70e513c76141b086b8e535',
  id='DIC-Q-509-stale-project-shot-comment-20261122';
 const restored=[
  ['scripts/audit/run-full-suite.mjs','4c76dc5721eec24b002bcd62055b116911ae6c4e'],
  ['tests/ci-optimization.test.mjs','21dc97fee802315487cb95e07678f02023989d21']
 ];
 const excluded=[
  'scripts/audit/issue33-r429-ohenry320-sodality341-check.mjs',
  'scripts/audit/issue33-r430-disciples-original100-check.mjs',
  'scripts/audit/issue33-r431-staccato-original354-check.mjs',
  'scripts/audit/issue33-r433-duesouth-selected-check.mjs',
  'scripts/audit/issue33-r434-south17-selected-check.mjs'
 ];
 const qa=[
  {path:'tests/helpers/release-published-restoration.mjs',source_sha:'fe1dd86406dc1c984dd4024a47225d1f8d4a40c0'},
  {path:'tests/preflight-contract.test.mjs',source_sha:'f893c068e20c2445bc5596eda6b36c832974f195'}
 ];
 const x={reviewed_source_reference_sha:'b1cbddd2fcbabcd5bf5ef00f48ca9d2e9475cb77',
  reviewed_source_reference_tree_sha:'ac379329eb318e49d1f71df1c5217f750953981b',
  restored_to_published_nonshipped_paths:restored.map(y=>y[0]),
  excluded_unready_nonshipped_paths:excluded,
  changed_executable_paths_exactly_seven:true,certified_ready:false,publication_authorized:false,
  merged_qa_candidate_fix_sha:development,reviewed_merged_qa_test_blobs:qa};
 const manifest={publication_authorized:false,development_source_sha:development,
  candidate_branch:'release-candidates/prospect3889-544b06558ab9ab6df4ee',
  selected_ready_item_ids:[id],prospective_ready_preview:{selected_id:id,
   status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
   baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4'},
  nonpublishing_qa_restoration:x};
 const map=new Map(),at=(ref,path)=>map.get(ref+':'+path)??null;
 for(const [p,sha] of restored){
  map.set(published+':'+p,'100644:'+sha);map.set(candidate+':'+p,'100644:'+sha);
  map.set(development+':'+p,'100644:'+'a'.repeat(40));
 }
 for(const p of excluded)map.set(development+':'+p,'100644:'+'a'.repeat(40));
 for(const {path,source_sha} of qa){
  map.set(development+':'+path,'100644:'+source_sha);
  map.set(candidate+':'+path,'100644:'+source_sha);
 }
 const args={manifest,queue:{items:[{id,state:'READY'}]},developmentSourceSha:development,
  publishedSourceSha:published,candidateSha:candidate,sourceObjectAt:at};
 assert.deepEqual(prove(args),[...restored.map(y=>y[0]),...excluded]);
 assert.deepEqual(prove({...args,manifest:{...manifest,nonpublishing_qa_restoration:undefined}}),[]);
 for(const edit of [
  m=>{m.nonpublishing_qa_restoration.restored_to_published_nonshipped_paths=[]},
  m=>{m.nonpublishing_qa_restoration.excluded_unready_nonshipped_paths.push('scripts/audit/foreign.mjs')},
  m=>{m.nonpublishing_qa_restoration.certified_ready=true},
  m=>{m.nonpublishing_qa_restoration.reviewed_source_reference_sha='a'.repeat(40)},
  m=>{m.prospective_ready_preview.status='VERIFIED'},
  m=>{m.publication_authorized=true}
 ]){
  const m=structuredClone(manifest);edit(m);
  assert.throws(()=>prove({...args,manifest:m}),/HOLD/);
 }
 for(const path of [...restored.map(y=>y[0]),...excluded,...qa.map(y=>y.path)]){
  assert.throws(()=>prove({...args,sourceObjectAt:(ref,p)=>
   ref===candidate&&p===path?'100644:'+'f'.repeat(40):at(ref,p)}),/HOLD/,path);
 }
 assert.throws(()=>prove({...args,candidateSha:development}),/HOLD/);
});


test('#3889 historical scoped workstream journal is exact-parent, exact candidate and NONPUBLISHING only',async()=>{
 const {reviewedProspectiveScopedJournalPath:review}=await import('../scripts/release/ready-only-candidate.mjs');
 const parent='544b06558ab9ab6df4eea0410277b1a3c19f2fe4',
  candidate='16bc481b2c66c5229c70e513c76141b086b8e535',
  published='2d22d448160d428a977f06482323646b92818fcf',
  id='DIC-Q-509-stale-project-shot-comment-20261122',
  path='docs/workstreams/issue-3889.md';
 const objects=new Map([
  [parent+':'+path,'100644:26f10fff12e31e2c70215af9adb3d5832892b62b'],
  [candidate+':'+path,'100644:3e90ae0193c1fbb4dbaa3b00005df07143b337b1']
 ]);
 const reader=(ref,p)=>objects.get(ref+':'+p)||null;
 const manifest={candidate_branch:'release-candidates/prospect3889-544b06558ab9ab6df4ee',
  selected_ready_item_ids:[id],publication_authorized:false,
  prospective_ready_preview:{selected_id:id,baseline_queue_blob:
   '46304f47eb0e78fac8c7845155af86080900b3c4',
   status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING'}};
 const opts={manifest,queue:{items:[{id,state:'READY'}]},candidateSha:candidate,
  developmentSourceSha:parent,publishedSourceSha:published,sourceObjectAt:reader};
 assert.deepEqual(review(opts),[path]);
 assert.deepEqual(review({...opts,manifest:{}}),[]);
 const edits=[
  x=>{x.manifest.publication_authorized=true},
  x=>{x.manifest.selected_ready_item_ids.push('DIC-Q-509-unreviewed')},
  x=>{x.manifest.prospective_ready_preview.status='READY'},
  x=>{x.manifest.prospective_ready_preview.baseline_queue_blob='a'.repeat(40)},
  x=>{x.queue.items[0].state='TESTING'},
  x=>{x.candidateSha=parent},
  x=>{x.developmentSourceSha=candidate},
  x=>{x.publishedSourceSha=parent}
 ];
 for(const edit of edits){
  const obj=structuredClone({...opts,sourceObjectAt:null});obj.sourceObjectAt=reader;
  edit(obj);assert.throws(()=>review(obj),/HOLD/);
 }
 for(const [ref,sha] of [
  [parent,'100644:'+'b'.repeat(40)],
  [candidate,'100644:'+'b'.repeat(40)],
  [published,'100644:'+'b'.repeat(40)]
 ])assert.throws(()=>review({...opts,sourceObjectAt:(r,p)=>
  r===ref&&p===path?sha:reader(r,p)}),/HOLD/);
 assert.throws(()=>assertExactCandidateStagedPaths(
  [path,'docs/RELEASE_QUEUE.json'],[path]),/staging commit changes unrelated paths/);
});


test('#3889 batch staging admits only an independently replayed exact local plan; never remote manifest alone',async()=>{
 const {reviewedProspectiveBatchQueuePath:prove,reviewedProspectivePromotionQueueParity:parity}=await import('../scripts/release/ready-only-candidate.mjs');
 const A='a'.repeat(40),B='b'.repeat(40),C='c'.repeat(40),branch='release-candidates/prospectbatch3889-'+'d'.repeat(20);
 const ids=['DIC-Q-509-first','DIC-Q-509-second'];
 const rows=ids.map((id,i)=>({id,issue:509,title:'synthetic '+i,state:'READY',owner_source:'fixture',merged_source_sha:A,scope_paths:['site/'+i+'.js'],tests:['fixture'],ci_runs:[123],blockers:[]}));
 const queue={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',published_base:{tested_source_sha:A,release_sha:B,netlify_deploy_id:'fixture'},items:rows,history:[]};
 const p={status:'PROSPECTIVE_BATCH_PLAN_ONLY',publication_authorized:false,ready_certified:false,development_source_sha:A,baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',identity_sha256:'e'.repeat(64),added_ids:[ids[1]],retained_ready_ids:[ids[0]],queue};
 const x={status:p.status,baseline_queue_blob:p.baseline_queue_blob,identity_sha256:p.identity_sha256,added_ids:p.added_ids,retained_ready_ids:p.retained_ready_ids,publication_authorized:false,ready_certified:false};
 const manifest={publication_authorized:false,development_source_sha:A,candidate_branch:branch,selected_ready_item_ids:ids,prospective_ready_batch_preview:x};
 const opts={manifest,queue,developmentSourceSha:A,candidateSha:B,candidateBranch:branch,prospectiveBatchPlan:p,sourceObjectAt:sha=>'100644:'+(sha===A?C:B)};
 assert.deepEqual(prove(opts),['docs/RELEASE_QUEUE.json']);
 assert.throws(()=>prove({...opts,prospectiveBatchPlan:null}),/HOLD/);
 assert.equal(parity({manifest,originalQueue:'old',candidateQueue:'new',liveQueue:'new'}),false);
 for(const edit of [
  o=>{o.manifest.selected_ready_item_ids.pop()},o=>{o.manifest.prospective_ready_batch_preview.identity_sha256='f'.repeat(64)},
  o=>{o.manifest.publication_authorized=true},o=>{o.prospectiveBatchPlan.ready_certified=true},
  o=>{o.queue.items[0].state='TESTING'},o=>{o.manifest.prospective_ready_batch_preview.added_ids=['DIC-Q-509-other']},
 ]){const o=structuredClone({...opts,sourceObjectAt:undefined});o.sourceObjectAt=opts.sourceObjectAt;edit(o);assert.throws(()=>prove(o),/HOLD/);}
 assert.throws(()=>prove({...opts,sourceObjectAt:()=> '100644:'+C}),/HOLD/);
});

test('#3889 exact two-ID batch reuses only previously certified seven nonshipped restorations',async()=>{
 const {BATCH_QA_PATHS:paths,discoverReviewedBatchQaRestoration:discover,reviewedBatchQaRestorationPaths:validate}=await import('../scripts/release/ready-only-candidate.mjs');
 const dev='e7508effcb45a77c0f73c8f2f236d6e5b3ffe8d0',qaFix='e7508effcb45a77c0f73c8f2f236d6e5b3ffe8d0',ref='544b06558ab9ab6df4eea0410277b1a3c19f2fe4',pub='2d22d448160d428a977f06482323646b92818fcf',previous='16bc481b2c66c5229c70e513c76141b086b8e535',candidate='a'.repeat(40);
 const ids=['DIC-Q-33-r399-original99-producer-tenure-precision','DIC-Q-509-stale-project-shot-comment-20261122'];
 const merges=['513f98ac06cdd0fe569390354420158458342859','5b5159823908f3ae660f45b3ad93c096be586aec'];
 const queue={items:ids.map((id,n)=>({id,state:'READY',merged_source_sha:merges[n]}))};
 const support={'tests/helpers/release-published-restoration.mjs':'8ba8fd6f41cb5193a892868efd0c87840af24d90','tests/preflight-contract.test.mjs':'f2aab94820d72d5c9f51cefa46137d5593b3a276'};
 const priorSupport={'tests/helpers/release-published-restoration.mjs':'fe1dd86406dc1c984dd4024a47225d1f8d4a40c0','tests/preflight-contract.test.mjs':'f893c068e20c2445bc5596eda6b36c832974f195'};
 const current='100644:'+'b'.repeat(40),old='100644:'+'c'.repeat(40);
 const read=(sha,path)=>{
  if(support[path]){
   if(sha===previous||sha===pub)return '100644:'+priorSupport[path];
   if([dev,qaFix,candidate].includes(sha))return '100644:'+support[path];
  }
  if([dev,ref].includes(sha))return current;
  if([pub,previous,candidate].includes(sha))return path.includes('issue33')?null:old;
  return null;
 };
 const args={queue,selectedIds:ids,publishedSourceSha:pub,developmentSourceSha:dev,sourceObjectAt:read};
 const manifest={selected_ready_item_ids:ids,prospective_ready_batch_preview:{},restored_reviewed_batch_qa_paths:paths};
 const proof={...args,manifest,candidateSha:candidate};
 assert.equal(paths.length,7);
 assert.deepEqual(discover(args),paths);
 assert.deepEqual(validate(proof),paths);
 assert.deepEqual(discover({...args,selectedIds:[ids[0]]}),[]);
 assert.throws(()=>validate({...proof,manifest:{...manifest,restored_reviewed_batch_qa_paths:[]}}),/HOLD/);
 assert.throws(()=>validate({...proof,manifest:{...manifest,restored_reviewed_batch_qa_paths:[...paths,'site/intruder.js']}}),/HOLD/);
 for(const [sha,path] of [[dev,paths[0]],[previous,paths[0]],[merges[0],paths[0]],[candidate,paths[0]],[candidate,Object.keys(support)[0]],[dev,Object.keys(support)[0]],[qaFix,Object.keys(support)[1]],[previous,Object.keys(support)[1]]]){
  assert.throws(()=>validate({...proof,sourceObjectAt:(r,p)=>r===sha&&p===path?'100644:'+'d'.repeat(40):read(r,p)}),/HOLD/);
 }
 assert.throws(()=>validate({...proof,publishedSourceSha:dev}),/HOLD/);
});

test('#3889 independently replayed two-ID batch queue parity requires exact LIVE bytes and preserves old READY',async()=>{
 const {reviewedProspectivePromotionQueueParity:parity}=await import('../scripts/release/ready-only-candidate.mjs');
 const oldId='DIC-Q-509-stale-project-shot-comment-20261122',newId='DIC-Q-33-r399-original99-producer-tenure-precision';
 const row=(id,issue,state)=>({id,issue,title:'Synthetic scoped source',state,
  owner_source:'https://github.com/Schulzet3/The-Dial-In-Collective/issues/3889',
  merged_source_sha:'a'.repeat(40),scope_paths:['src/server/'+issue+'.mjs'],
  tests:['synthetic PASS'],ci_runs:[1234],blockers:state==='TESTING'?['frozen candidate pending']:[]});
 const source={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
  published_base:{tested_source_sha:'2d22d448160d428a977f06482323646b92818fcf',
   release_sha:'5b256f1fc0717d3635f7148b934a1f91f8991685',netlify_deploy_id:'synthetic'},
  items:[row(oldId,509,'READY'),row(newId,33,'TESTING')],history:[]};
 const proposed=structuredClone(source);proposed.items[1].state='READY';proposed.items[1].blockers=[];
 const p={status:'PROSPECTIVE_BATCH_PLAN_ONLY',ready_certified:false,publication_authorized:false,
  baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
  development_source_sha:'e7508effcb45a77c0f73c8f2f236d6e5b3ffe8d0',
  identity_sha256:'1'.repeat(64),added_ids:[newId],retained_ready_ids:[oldId],queue:proposed};
 const m={kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  candidate_branch:'release-candidates/prospectbatch3889-'+'1'.repeat(20),
  development_source_sha:p.development_source_sha,published_source_sha:source.published_base.tested_source_sha,
  selected_ready_item_ids:[newId,oldId],
  prospective_ready_batch_preview:{status:p.status,publication_authorized:false,
   ready_certified:false,baseline_queue_blob:p.baseline_queue_blob,
   added_ids:[newId],retained_ready_ids:[oldId],identity_sha256:p.identity_sha256}};
 const originalQueue=JSON.stringify(source,null,2)+'\n',candidateQueue=JSON.stringify(proposed,null,2)+'\n';
 const opts={manifest:m,originalQueue,candidateQueue,liveQueue:candidateQueue,prospectiveBatchPlan:p};
 assert.equal(parity(opts),true);
 assert.equal(parity({...opts,prospectiveBatchPlan:null}),false,'remote manifest alone cannot certify source');
 assert.equal(parity({...opts,liveQueue:originalQueue}),false,'unpromoted queue is not READY');
 assert.equal(parity({...opts,liveQueue:candidateQueue+' '}),false,'live byte drift is forbidden');
 assert.equal(parity({...opts,manifest:{...m,publication_authorized:true}}),false,'no release grant');
 assert.equal(parity({...opts,manifest:{...m,selected_ready_item_ids:[newId]}}),false);
 assert.equal(parity({...opts,manifest:{...m,prospective_ready_batch_preview:{...m.prospective_ready_batch_preview,identity_sha256:'2'.repeat(64)}}}),false);
 const forged=structuredClone(proposed);forged.items[0].title='Tampered old READY';
 assert.equal(parity({...opts,candidateQueue:JSON.stringify(forged,null,2)+'\n',liveQueue:JSON.stringify(forged,null,2)+'\n'}),false);
 const flawed=structuredClone(proposed);flawed.items[1].scope_paths=['src/server/intruder.mjs'];
 const wrongPlan={...p,queue:flawed};
 assert.equal(parity({...opts,prospectiveBatchPlan:wrongPlan}),false);
 const extra=structuredClone(proposed);extra.items.push(row('DIC-Q-509-extra',509,'READY'));
 assert.equal(parity({...opts,prospectiveBatchPlan:{...p,queue:extra},candidateQueue:JSON.stringify(extra,null,2)+'\n',liveQueue:JSON.stringify(extra,null,2)+'\n'}),false);
});

for(const generation of [1,2,3,4,5,6])test('#3889 arbitrary cohort QA restores only unselected reviewed paths with exact plan and support, generation '+generation,async()=>{
 const {BATCH_QA_PATHS:paths,discoverReviewedBatchQaRestoration:discover,reviewedBatchQaRestorationPaths:validate}=await import('../scripts/release/ready-only-candidate.mjs');
 const oldDev='b58c1a4c856fc65a56bf27b2a0ded20245f6351b',v2Dev='85ece2e2b4e38b3445e5125045748dd212e421d4',v3Dev='c4b3f2c10d54a4790cc0cd0b2b3b190dc46e501a',v4Dev='22254f501af8c0d5f6f89763ea5387b755fdd0bf',v5Dev='542949c23fbbf481de00acdbd77e6c926ebde879',dev=generation===6?'09c45de5063e1d743ce497aea2557974c86f52ca':generation===5?v5Dev:generation===4?v4Dev:generation===3?v3Dev:generation===2?v2Dev:oldDev,prior='0317f0ac5b627dff27180acfcb9c014a4c1ef0e5',
  reference='544b06558ab9ab6df4eea0410277b1a3c19f2fe4',previous='16bc481b2c66c5229c70e513c76141b086b8e535',
  pub='2d22d448160d428a977f06482323646b92818fcf',candidate='a'.repeat(40);
 const ids=['DIC-Q-33-r399-original99-producer-tenure-precision','DIC-Q-509-stale-project-shot-comment-20261122','DIC-Q-3667-ci-parallel-full-suite'];
 const merges=['513f98ac06cdd0fe569390354420158458342859','5b5159823908f3ae660f45b3ad93c096be586aec','8e89dfe9'+'b'.repeat(32)];
 const queue={items:ids.map((id,n)=>({id,state:'READY',merged_source_sha:merges[n],scope_paths:[n===2?'package.json':'site/fixture'+n]}))};
 const p={kind:'DIC-PROSPECTIVE-CHRONOLOGICAL-BATCH-3889-V2',status:'PROSPECTIVE_BATCH_PLAN_ONLY',
  publication_authorized:false,ready_certified:false,baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
  development_source_sha:dev,published_base:{tested_source_sha:pub},identity_sha256:'c'.repeat(64),
  added_ids:[ids[2]],retained_ready_ids:ids.slice(0,2),queue};
 const support={
  'tests/helpers/release-published-restoration.mjs':['7a13c4b9a76a9fb03a491d33e559fc4cd9709e1c','8ba8fd6f41cb5193a892868efd0c87840af24d90'],
  'tests/preflight-contract.test.mjs':['77f41ca1c434271a1100dfc3e27fa18ef110800d','f2aab94820d72d5c9f51cefa46137d5593b3a276'],
  'tests/required-check-workflows.test.mjs':['50d74fa8ef9e39043b11c467a519aa8a70573835','50d74fa8ef9e39043b11c467a519aa8a70573835']};
 const newSupport={
  'tests/helpers/release-published-restoration.mjs':'241d2013e3a0c6473e68c7c738592d71428b6f0a',
  'tests/preflight-contract.test.mjs':'5317e8d96e14a4d1fc4e7b668f13c342f9cb335d',
  'tests/required-check-workflows.test.mjs':'50d74fa8ef9e39043b11c467a519aa8a70573835'};
 const newestSupport={
  'tests/helpers/release-published-restoration.mjs':'cdfe549202ef91d917476968de3567a66c6113c2',
  'tests/preflight-contract.test.mjs':'13f7b9da15639ce131ce82ef7a6e7e9ea2d26baf',
  'tests/required-check-workflows.test.mjs':'50d74fa8ef9e39043b11c467a519aa8a70573835'};
 const v4Support={
  'tests/helpers/release-published-restoration.mjs':'61a2010c1726b5c719eebf3afe933194ee8bed10',
  'tests/preflight-contract.test.mjs':'76904dbfe1e57df278601c4bf846f2f02a69a754',
  'tests/required-check-workflows.test.mjs':'50d74fa8ef9e39043b11c467a519aa8a70573835'};
 const v5Support={
  'tests/helpers/release-published-restoration.mjs':'04f6010a7c2ca781b3e9c0eca3bf18d83e623826',
  'tests/preflight-contract.test.mjs':'24518329594e4937675c4c30a0d82c73e2882215',
  'tests/required-check-workflows.test.mjs':'50d74fa8ef9e39043b11c467a519aa8a70573835'};
 const v6Support={
  'tests/helpers/release-published-restoration.mjs':'03ea670669ec6ebd14c23106d55c33aea56d5220',
  'tests/preflight-contract.test.mjs':'dc947f96e3d3f7efd7f74f8709db5b988791bb71',
  'tests/required-check-workflows.test.mjs':'50d74fa8ef9e39043b11c467a519aa8a70573835'};
 const selectedPath='scripts/audit/run-full-suite.mjs',current='100644:'+'d'.repeat(40),old='100644:'+'e'.repeat(40);
 const expected=paths.filter(x=>x!==selectedPath);
 const read=(ref,path)=>{
  if(support[path]){
   if(ref===prior)return '100644:'+support[path][1];
   if(ref===oldDev)return '100644:'+support[path][0];
   if(ref===v2Dev)return '100644:'+newSupport[path];
   if(ref===v3Dev)return '100644:'+newestSupport[path];
   if(ref===v4Dev)return '100644:'+v4Support[path];
   if(ref===v5Dev)return '100644:'+v5Support[path];
   if([dev,candidate].includes(ref))return '100644:'+(generation===6?v6Support[path]:generation===5?v5Support[path]:generation===4?v4Support[path]:generation===3?newestSupport[path]:generation===2?newSupport[path]:support[path][0]);
   return null;
  }
  if(path===selectedPath){
   if([merges[2],dev,reference,candidate].includes(ref))return current;
   if([merges[2]+'^',pub,previous,prior].includes(ref))return old;
  }
  if([dev,reference].includes(ref))return current;
  if([pub,previous,prior,candidate].includes(ref))return path.includes('issue33')?null:old;
  return null;
 };
 const args={queue,selectedIds:ids,publishedSourceSha:pub,developmentSourceSha:dev,sourceObjectAt:read,prospectiveBatchPlan:p};
 const manifest={selected_ready_item_ids:ids,prospective_ready_batch_preview:{},restored_reviewed_batch_qa_paths:expected};
 const proof={...args,manifest,candidateSha:candidate};
 assert.deepEqual(discover(args),expected);
 assert.deepEqual(validate(proof),expected);
 assert.deepEqual(discover({...args,prospectiveBatchPlan:null}),[]);
 assert.throws(()=>validate({...proof,manifest:{...manifest,restored_reviewed_batch_qa_paths:paths}}),/HOLD/);
 assert.throws(()=>validate({...proof,manifest:{...manifest,restored_reviewed_batch_qa_paths:[...expected,'site/intruder.js']}}),/HOLD/);
 assert.throws(()=>discover({...args,prospectiveBatchPlan:{...p,publication_authorized:true}}),/HOLD/);
 assert.throws(()=>discover({...args,prospectiveBatchPlan:{...p,added_ids:[]}}),/HOLD/);
 assert.throws(()=>discover({...args,prospectiveBatchPlan:{...p,queue:{items:queue.items.slice(1)}}}),/HOLD/);
 assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===expected[0]?current:read(r,x)}),/HOLD/);
 assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===Object.keys(support)[0]?old:read(r,x)}),/HOLD/);
 if(generation===6){
  for(const path of Object.keys(v6Support).slice(0,2)){
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===path?'100644:'+v5Support[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===path?'100644:'+v5Support[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===v5Dev&&x===path?old:read(r,x)}),/HOLD/);
  }
 }
 if(generation===5){
  for(const path of Object.keys(v5Support).slice(0,2)){
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===path?'100644:'+v4Support[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===path?'100644:'+v4Support[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===v4Dev&&x===path?old:read(r,x)}),/HOLD/);
  }
 }
 if(generation===4){
  for(const path of Object.keys(v4Support).slice(0,2)){
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===path?'100644:'+newestSupport[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===path?'100644:'+newestSupport[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===v3Dev&&x===path?old:read(r,x)}),/HOLD/);
  }
 }
 if(generation===3){
  for(const path of Object.keys(newestSupport).slice(0,2)){
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===path?'100644:'+newSupport[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===path?'100644:'+newSupport[path]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===v2Dev&&x===path?old:read(r,x)}),/HOLD/);
  }
 }
 if(generation===2){
  for(const path of Object.keys(newSupport).slice(0,2)){
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===dev&&x===path?'100644:'+support[path][0]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===candidate&&x===path?'100644:'+support[path][0]:read(r,x)}),/HOLD/);
   assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===oldDev&&x===path?old:read(r,x)}),/HOLD/);
  }
 }
 assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===merges[2]&&x===Object.keys(support)[0]?current:read(r,x)}),/HOLD/);
 assert.throws(()=>validate({...proof,sourceObjectAt:(r,x)=>r===prior&&x===expected[0]?current:read(r,x)}),/HOLD/);
});


test('#3889 mixed selected and excluded reviewed SQL fixtures preserve selected exact first-parent tests',()=>{
 const specs=REVIEWED_UNREADY_SQL_SUITE.filter(s=>[
  'pending_canonical_name_response.sql','recommendation_unique_controls.sql',
  'community_outlier_null_revision.sql','admin_shot_delete_family_refresh.sql',
  'admin_account_delete_completed_receipt.sql'].some(n=>s.path.endsWith('/'+n)));
 assert.equal(specs.length,5);
 const rows=specs.map((spec,i)=>({id:'DIC-Q-509-fixture-'+i,issue:509,
  state:i===4?'TESTING':'READY',merged_source_sha:String(i+1).repeat(40),scope_paths:[spec.migration]}));
 const selected=rows.slice(0,4),objects=new Map();
 const key=(ref,path)=>ref+':'+path;
 for(const [i,spec] of specs.entries()){
  const row=rows[i];
  // Use distinct valid hexadecimal object IDs for both selected and excluded.
  const migration='100644:'+['a','b','c','d','e'][i].repeat(40);
  for(const ref of [B,row.merged_source_sha,spec.sourceMerge]){
   objects.set(key(ref,spec.migration),migration);
   objects.set(key(ref,spec.path),'100644:'+spec.unpublishedBlob);
  }
 }
 const sourceObjectAt=(ref,path)=>objects.get(key(ref,path))??null;
 const args={queue:{items:rows},restoredPaths:[specs[4].migration],
  publishedSourceSha:A,developmentSourceSha:B,sourceObjectAt,selectedReadyItems:selected};
 assert.deepEqual(discoverReviewedRestoredSqlTests(args),[specs[4].path]);
 // planReadyOnlyCandidate deliberately projects ready_items without state.
 // The authoritative queue row, not the projection, establishes READY.
 const projected=selected.map(({state,...row})=>row);
 assert.deepEqual(discoverReviewedRestoredSqlTests({...args,selectedReadyItems:projected}),[specs[4].path]);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,selectedReadyItems:projected,queue:{items:rows.map(x=>x===selected[0]?{...x,state:'TESTING'}:x)}}),/Selected READY SQL fixture lacks exact/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,selectedReadyItems:projected.map((x,i)=>i===0?{...x,state:'TESTING'}:x)}),/Selected READY SQL fixture lacks exact/);
 assert.deepEqual(discoverReviewedRestoredSqlTests({...args,queue:{items:selected},restoredPaths:[],
  sourceObjectAt:(r,p)=>[specs[4].path,specs[4].migration].includes(p)?null:sourceObjectAt(r,p)}),[]);
 const spec=specs[0],row=selected[0];
 for(const [ref,path,object] of [[B,spec.path,'100644:'+D],
  [row.merged_source_sha,spec.path,'100644:'+D],
  [row.merged_source_sha+'^',spec.path,'100644:'+D],
  [row.merged_source_sha,spec.migration,'100644:'+D],
  [spec.sourceMerge,spec.migration,'100644:'+D],
  [A,spec.migration,'100644:'+D]]){
  assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(r,p)=>
   r===ref&&p===path?object:sourceObjectAt(r,p)}),/Selected READY SQL fixture lacks exact/);
 }
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,restoredPaths:[...args.restoredPaths,spec.migration]}),/Selected READY SQL fixture lacks exact/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,queue:{items:rows.map(x=>x===row?{...x,state:'TESTING'}:x)}}),/Selected READY SQL fixture lacks exact/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,queue:{items:[...rows,{...row,id:'DIC-Q-509-unready-overlap',state:'TESTING'}]}}),/Selected READY SQL fixture lacks exact/);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(r,p)=>r===selected[1].merged_source_sha&&p===spec.path?'100644:'+D:sourceObjectAt(r,p)}),/Other selected READY merge modified SQL fixture/);
});

test('#3889 shared SQL fixture requires both exact chronological migration owners or both excluded',()=>{
 const spec=REVIEWED_UNREADY_SQL_SUITE.find(x=>x.path==='supabase/tests/community_quality_integrity.sql');
 const rows=spec.chain.map(x=>({id:x.id,issue:509,state:'READY',merged_source_sha:x.merge,scope_paths:[x.migration]}));
 const objects=new Map(),put=(r,p,b)=>objects.set(r+':'+p,'100644:'+b);
 put(A,spec.path,spec.publishedBlob);put(B,spec.path,spec.unpublishedBlob);
 let previous=spec.publishedBlob;
 for(const step of spec.chain){
  put(step.merge+'^',spec.path,previous);put(step.merge,spec.path,step.after);
  put(step.merge,step.migration,step.migrationBlob);put(B,step.migration,step.migrationBlob);
  previous=step.after;
 }
 // Historical original PR source is additionally checked on exclusion.
 put(spec.sourceMerge,spec.path,spec.unpublishedBlob);
 put(spec.sourceMerge+'^',spec.path,spec.chain[0].after);
 const read=(r,p)=>objects.get(r+':'+p)??null;
 const args={queue:{items:rows},restoredPaths:[],publishedSourceSha:A,developmentSourceSha:B,sourceObjectAt:read,selectedReadyItems:rows};
 assert.deepEqual(discoverReviewedRestoredSqlTests(args),[]);
 for(const row of rows){
  const other=rows.find(x=>x!==row);
  assert.throws(()=>discoverReviewedRestoredSqlTests({...args,selectedReadyItems:[row],restoredPaths:other.scope_paths,queue:{items:[row,{...other,state:'TESTING'}]}}),/Shared SQL fixture lacks/);
 }
 for(const step of spec.chain){
  for(const [ref,path] of [[step.merge+'^',spec.path],[step.merge,spec.path],[B,step.migration],[A,step.migration],[step.merge+'^',step.migration]]){
   assert.throws(()=>discoverReviewedRestoredSqlTests({...args,sourceObjectAt:(r,p)=>r===ref&&p===path?'100644:'+D:read(r,p)}),/Shared SQL fixture lacks/);
  }
 }
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,queue:{items:[...rows,{...rows[0],id:'unready-overlap',state:'TESTING'}]}}),/Shared SQL fixture lacks/);
 const excluded=rows.map(x=>({...x,state:'TESTING'}));
 const restoredPaths=rows.flatMap(x=>x.scope_paths);
 assert.deepEqual(discoverReviewedRestoredSqlTests({...args,queue:{items:excluded},selectedReadyItems:[],restoredPaths}),[spec.path]);
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,queue:{items:excluded},selectedReadyItems:[],restoredPaths:restoredPaths.slice(1)}),/Shared SQL fixture lacks/);
 const stranger={...one,merged_source_sha:C};
 assert.throws(()=>discoverReviewedRestoredSqlTests({...args,selectedReadyItems:[...rows,stranger],sourceObjectAt:(r,p)=>r===C&&p===spec.path?'100644:'+D:read(r,p)}),/Shared SQL fixture lacks/);
});
