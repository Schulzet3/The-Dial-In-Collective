import test from 'node:test';
import assert from 'node:assert/strict';
import {planReadyOnlyCandidate,validateReadyOnlyCandidate,CANDIDATE_KIND,
 CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH,REVIEWED_WORKFLOW_TEST,discoverReviewedWorkflowTestExclusions,discoverExcludedUnreadyTests} from '../scripts/release/ready-only-candidate.mjs';
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
 selected_ready_item_ids:[one.id],restored_to_published_paths:['src/server/extractor.mjs']};
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
