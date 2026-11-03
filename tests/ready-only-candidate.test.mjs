import test from 'node:test';
import assert from 'node:assert/strict';
import {planReadyOnlyCandidate,validateReadyOnlyCandidate,CANDIDATE_KIND,
 CANDIDATE_RECEIPT_PATH,CANDIDATE_JOURNAL_PATH} from '../scripts/release/ready-only-candidate.mjs';
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
