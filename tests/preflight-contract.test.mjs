import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {auditPreflightContract,CONTRACT_PATHS} from '../scripts/audit/preflight-contract.mjs';
const testingReceipt=new URL('../docs/TESTING_3889_CANDIDATE.json',import.meta.url);
const receiptPath=existsSync(testingReceipt)?testingReceipt:new URL('../docs/RELEASE_CANDIDATE.json',import.meta.url);
const candidateReceipt=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):null;
const read=path=>{
 const local=readFileSync(new URL('../'+path,import.meta.url),'utf8');
 if(!candidateReceipt||path!=='.github/workflows/approval-continuity.yml')return local;
 // The verified source under test is the candidate's immutable development
 // parent. The publication candidate MUST preserve published workflow bytes.
 assert.ok(['DIC-READY-ONLY-SOURCE-1','DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1'].includes(candidateReceipt.kind));
  assert.equal(candidateReceipt.publication_authorized,false);
 assert.match(candidateReceipt.development_source_sha,/^[a-f0-9]{40}$/);
 assert.match(candidateReceipt.published_source_sha,/^[a-f0-9]{40}$/);
 assert.ok((candidateReceipt.restored_unpublished_workflow_paths||candidateReceipt.restored_to_published_paths||[]).includes(path));
 const at=sha=>execFileSync('git',['show',sha+':'+path],{encoding:'utf8',timeout:10000});
 assert.equal(local,at(candidateReceipt.published_source_sha),
  'candidate approval workflow must match published Git bytes');
 return at(candidateReceipt.development_source_sha);
};
const snapshot=Object.fromEntries(CONTRACT_PATHS.map(path=>[path,read(path)]));
const change=(path,fn)=>auditPreflightContract(p=>p===path?fn(snapshot[p]):snapshot[p]);
test('single live preflight route is intact without added build or publisher',()=>{
 assert.deepEqual(auditPreflightContract(read),[]);
 const liveRoute=read('docs/ai/PREFLIGHT.md');
 assert.match(liveRoute,/Owner #3347 narrowly permits early nonpublishing READY-only source isolation and exact candidate CI/);
 assert.match(liveRoute,/No production grant, release request or publication write from a development-only request/);
});
test('missing or weakened fail-closed authority is rejected',()=>{
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('**Fail closed:**','**Optional:**')).join(' '),/missing mandatory contract/);
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('PREFLIGHT_UNAVAILABLE','CONTINUE_ANYWAY')).join(' '),/PREFLIGHT_UNAVAILABLE/);
});
test('AGENTS and the topic map cannot silently become alternate first documents',()=>{
 assert.match(change('AGENTS.md',s=>s.replace('# START HERE — mandatory DIC preflight','Historical note')).join(' '),/AGENTS.md: must put/);
 assert.match(change('docs/ai/CONTEXT_ENTRYPOINT.md',s=>s.replace('topic map AFTER mandatory PREFLIGHT.md','primary entrypoint')).join(' '),/must be secondary/);
});
test('documentation index and Project Instructions fail on route drift',()=>{
 assert.match(change('docs/README.md',s=>s.replace('Mandatory FIRST document','Optional reference')).join(' '),/wrong first document/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('FAIL CLOSED: no GitHub/provider writes','continue from memory')).join(' '),/Project Instructions must/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('FIRST fetch live `development/backend-foundation` SHA','FIRST fetch live development SHA')).join(' '),/Project Instructions must/);
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s.replace('Branches: development/backend-foundation=app','Branches: development=app')).join(' '),/Project Instructions must/);
});
test('instructions over 8000 chars or missing live source fail closed',()=>{
 assert.match(change('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',s=>s+'X'.repeat(200)).join(' '),/exceed 8000/);
 assert.match(auditPreflightContract(p=>{if(p==='docs/ai/PREFLIGHT.md')throw Error('unavailable');return snapshot[p];}).join(' '),/cannot read authoritative source/);
});
test('removing approval job enforcement is detected',()=>{
 assert.match(change('.github/workflows/approval-continuity.yml',s=>s.replace('run: node scripts/audit/preflight-contract.mjs','run: true')).join(' '),/workflow lacks preflight/);
});

test('removing Git-object receipt audit from continuity is rejected',()=>{
 assert.match(change('scripts/audit/verify-commit-checkpoint.mjs',s=>s.replace('auditPreflightReceipt(','bypassReceipt(')).join(' '),/preflight Git receipt gate missing/);
 assert.match(change('docs/ai/PREFLIGHT.md',s=>s.replace('DIC_PREFLIGHT_VERIFIED','MISSING_EVIDENCE')).join(' '),/missing mandatory contract/);
});

import {verifyProspectiveReadyTestScope,verifyProspectiveBatchReadyTestScope} from './helpers/release-published-restoration.mjs';
test('#3889 prospective published-source QA excludes only exact proven unselected work',()=>{
 const id='DIC-Q-509-stale-project-shot-comment-20261122';
 const migration='supabase/migrations/20261122214500_dic_project_shot_comment_refresh.sql';
 const dev='a'.repeat(40),pub='2d22d448160d428a977f06482323646b92818fcf';
 const merge='5b5159823908f3ae660f45b3ad93c096be586aec';
 const m={schema_version:1,kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  candidate_branch:'release-candidates/prospect3889-'+'a'.repeat(20),
  development_source_sha:dev,published_source_sha:pub,selected_ready_item_ids:[id],
  restored_to_published_paths:['site/cloud/main.js'],restored_unpublished_workflow_paths:[],
  prospective_ready_preview:{status:'PROSPECTIVE_ONLY_FIVE_CI_AND_PROMOTION_PENDING',
   selected_id:id,baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
   identity_sha256:'b'.repeat(64)}};
 const q={published_base:{tested_source_sha:pub},items:[{id,issue:509,state:'READY',
  merged_source_sha:merge,scope_paths:[migration],tests:['existing native CI'],
  ci_runs:[45252457892],blockers:[]}]};
 const opts={manifest:m,queue:q,branch:'refs/heads/'+m.candidate_branch,
  commitParent:dev,sourceObjectAt:()=> '84cecbe69143b2170aa97a851198cc35b9926303'};
 assert.equal(verifyProspectiveReadyTestScope(opts),true);
 assert.equal(verifyProspectiveReadyTestScope({...opts,manifest:{}}),false);
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,manifest:{...m,publication_authorized:true}}));
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,manifest:{...m,candidate_branch:'release-candidates/unreviewed'}}));
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,commitParent:'c'.repeat(40)}));
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,queue:{...q,items:[{...q.items[0],state:'TESTING'}]}}));
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,queue:{...q,items:[...q.items,{id:'unready',state:'READY'}]}}));
 assert.throws(()=>verifyProspectiveReadyTestScope({...opts,sourceObjectAt:()=> 'f'.repeat(40)}));
});

test('#3889 two-ID preview requires exact selection, immutable queue and selected runtime/test objects',()=>{
 const migration='supabase/migrations/20261122214500_dic_project_shot_comment_refresh.sql';
 const runtime='src/server/coffee-narrative-evidence.mjs';
 const selectedTest='tests/coffee-issue33-r399-keller-tenure.test.mjs';
 const r399='DIC-Q-33-r399-original99-producer-tenure-precision';
 const ready1='DIC-Q-509-stale-project-shot-comment-20261122';
 const dev='a'.repeat(40),pub='2d22d448160d428a977f06482323646b92818fcf';
 const baseline='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
 const baselineQueue='46304f47eb0e78fac8c7845155af86080900b3c4';
 const m={schema_version:1,kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  candidate_branch:'release-candidates/prospectbatch3889-'+'a'.repeat(20),
  development_source_sha:dev,published_source_sha:pub,selected_ready_item_ids:[r399,ready1],
  restored_to_published_paths:['site/cloud/main.js'],restored_unpublished_workflow_paths:[],
  excluded_unready_test_paths:[],
  prospective_ready_batch_preview:{status:'PROSPECTIVE_BATCH_PLAN_ONLY',publication_authorized:false,
   ready_certified:false,baseline_queue_blob:baselineQueue,added_ids:[r399],
   retained_ready_ids:[ready1],identity_sha256:'b'.repeat(64)}};
 const row=(id,issue,merged_source_sha,path)=>({id,issue,merged_source_sha,state:'READY',
  scope_paths:[path],tests:['source test'],ci_runs:[1],blockers:[],production_deployed:false});
 const q={published_base:{tested_source_sha:pub},items:[
  row(ready1,509,'5b5159823908f3ae660f45b3ad93c096be586aec',migration),
  row(r399,33,'513f98ac06cdd0fe569390354420158458342859',runtime)]};
 const objects={[migration]:'84cecbe69143b2170aa97a851198cc35b9926303',
  [runtime]:'3de11626496a0b698e558ec8929f0158e3083b0a',
  [selectedTest]:'16c4d572ecd43860a9cd4f1a7f2baffd670382ee'};
 const sourceObjectAt=(ref,path)=>path==='docs/RELEASE_QUEUE.json'?
  ({[baseline]:baselineQueue,[dev]:'dd9c0ea0ad69590555b243dc3e5c81b6ac080e0c',HEAD:'3f4e6ed4fc81e843c10cc17b2468c34bc3a04818'})[ref]:objects[path];
 const opts={manifest:m,queue:q,commitParent:dev,branch:'refs/heads/'+m.candidate_branch,sourceObjectAt};
 assert.equal(verifyProspectiveBatchReadyTestScope(opts),true);
 assert.equal(verifyProspectiveBatchReadyTestScope({...opts,manifest:{}}),false);
 for(const changes of [
  {publication_authorized:true},{selected_ready_item_ids:[ready1]},
  {candidate_branch:'release-candidates/unreviewed'},
  {prospective_ready_preview:{}},
  {restored_to_published_paths:[runtime]},
  {excluded_unready_test_paths:[selectedTest]},
  {prospective_ready_batch_preview:{...m.prospective_ready_batch_preview,ready_certified:true}},
  {prospective_ready_batch_preview:{...m.prospective_ready_batch_preview,retained_ready_ids:[]}}
 ]) assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,manifest:{...m,...changes}}));
 assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,commitParent:'c'.repeat(40)}));
 assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,branch:'refs/heads/release-candidates/another'}));
 assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,queue:{...q,items:[...q.items,row('unready',33,'f'.repeat(40),'other')]}}));
 assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,path)=>path===selectedTest?'f'.repeat(40):sourceObjectAt(ref,path)}));
 assert.throws(()=>verifyProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,path)=>ref==='HEAD'&&path==='docs/RELEASE_QUEUE.json'?'f'.repeat(40):sourceObjectAt(ref,path)}));
});
