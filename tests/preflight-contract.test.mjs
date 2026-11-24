import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
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

import {verifyProspectiveReadyTestScope,verifyProspectiveBatchReadyTestScope,verifyGeneralProspectiveBatchReadyTestScope} from './helpers/release-published-restoration.mjs';
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

test('#3889 generalized scope reconstructs exact queue and rejects selected test or source contamination',()=>{
 const baselineRef='d9fc859d81a23e10ee2cd0e1a37013b93a4980e5';
 const baselineRaw=execFileSync('git',['show',baselineRef+':docs/RELEASE_QUEUE.json'],{
  encoding:'utf8',maxBuffer:4000000,timeout:15000});
 const baseline=JSON.parse(baselineRaw),pub=baseline.published_base.tested_source_sha;
 // Pick three distinct real baseline scope identities.
 const distinct=[];
 for(const x of baseline.items.filter(x=>x.state==='TESTING'&&x.scope_paths.length===1)){
  if(!distinct.some(y=>y.scope_paths[0]===x.scope_paths[0]))distinct.push(x);
  if(distinct.length===3)break;
 }
 assert.equal(distinct.length,3);
 const rows=distinct.map((x,i)=>({...x,merged_source_sha:String(i+1).repeat(40),
  state:'TESTING',production_deployed:false,tests:['fixture regression'],ci_runs:[i+1],blockers:['candidate certification']}));
 const parent=structuredClone(baseline);
 parent.items=parent.items.map(x=>rows.find(y=>y.id===x.id)||{...x,state:x.state==='TESTING'?'DEPLOYED':x.state});
 const queue=structuredClone(parent);
 for(const row of queue.items.filter(x=>rows.some(y=>y.id===x.id))){row.state='READY';row.blockers=[];}
 const ids=rows.map(x=>x.id).sort(),dev='a'.repeat(40);
 const m={schema_version:1,kind:'DIC-READY-ONLY-SOURCE-1',publication_authorized:false,
  candidate_branch:'release-candidates/prospectbatch3889-'+'a'.repeat(20),
  development_source_sha:dev,published_source_sha:pub,selected_ready_item_ids:ids,
  restored_to_published_paths:[],restored_unpublished_workflow_paths:[],
  prospective_ready_batch_preview:{status:'PROSPECTIVE_BATCH_PLAN_ONLY',publication_authorized:false,
   ready_certified:false,baseline_queue_blob:'46304f47eb0e78fac8c7845155af86080900b3c4',
   added_ids:ids,retained_ready_ids:[],identity_sha256:'b'.repeat(64)}};
 const pathRows=rows.map((x,i)=>({row:x,path:x.scope_paths[0],test:'tests/fixture-'+i+'.mjs',
  before:'100644:'+'c'.repeat(40),after:'100644:'+String(i+4).repeat(40)}));
 const raw={ [baselineRef]:baselineRaw,[dev]:JSON.stringify(parent,null,2)+'\n',HEAD:JSON.stringify(queue,null,2)+'\n'};
 const sourceObjectAt=(ref,path)=>{
  if(path==='docs/RELEASE_QUEUE.json'){
   const s=raw[ref];if(s===undefined)return null;
   const bytes=Buffer.from(s,'utf8');
   return '100644:'+createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  }
  const x=pathRows.find(x=>[x.path,x.test].includes(path));if(!x)return null;
  return [pub,x.row.merged_source_sha+'^'].includes(ref)?x.before:x.after;
 };
 const opts={manifest:m,queue,branch:'refs/heads/'+m.candidate_branch,commitParent:dev,
  readGitText:ref=>raw[ref],sourceObjectAt,
  firstParentChangedPaths:sha=>{const x=pathRows.find(x=>x.row.merged_source_sha===sha);return [x.path,x.test];},
  isAncestor:(a,b)=>b===dev};
 const selected=verifyGeneralProspectiveBatchReadyTestScope(opts);
 assert.deepEqual(selected,pathRows.flatMap(x=>[x.path,x.test]).sort());
 for(const changes of [
  {publication_authorized:true},{selected_ready_item_ids:ids.slice(1)},
  {restored_to_published_paths:[pathRows[0].path]},
  {excluded_unready_test_paths:[pathRows[0].test]},
  {restored_unpublished_workflow_paths:[pathRows[0].test]},
  {prospective_ready_batch_preview:{...m.prospective_ready_batch_preview,added_ids:ids.slice(1)}}
 ])assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,manifest:{...m,...changes}}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,commitParent:'f'.repeat(40)}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,branch:'refs/heads/unreviewed'}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,path)=>
  ref==='HEAD'&&path===pathRows[0].test?'100644:'+'f'.repeat(40):sourceObjectAt(ref,path)}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,path)=>
  ref===pathRows[0].row.merged_source_sha+'^'&&path===pathRows[0].path?'100644:'+'f'.repeat(40):sourceObjectAt(ref,path)}));
 const changed=structuredClone(queue);changed.items.find(x=>!ids.includes(x.id)).title+=' altered';
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,queue:changed}));
});

test('#3889 exact eight-ID frozen sibling and already-published SQL runner support remain source-bound',()=>{
 const frozen='8d144c217c52bff2780ff6c199282a0445ac1f8a';
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:4000000,timeout:20000});
 const ref=r=>r==='HEAD'?frozen:r;
 const readGitText=(r,path)=>git('show',ref(r)+':'+path);
 const sourceObjectAt=(r,path)=>{
  const lines=git('ls-tree','-z',ref(r),'--',path).split('\0').filter(Boolean);
  if(!lines.length)return null;
  assert.equal(lines.length,1);
  const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(lines[0]);
  assert.ok(match&&match[3]===path);
  return match[1]+':'+match[2];
 };
 const readParents=sha=>{
  const [commit,...parents]=git('rev-list','--parents','-n','1',sha).trim().split(/\s+/);
  assert.equal(commit,sha);return parents;
 };
 const isAncestor=(a,b)=>{
  try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',timeout:15000});return true;}
  catch(e){if(e.status===1)return false;throw e;}
 };
 const manifest=JSON.parse(readGitText('HEAD','docs/RELEASE_CANDIDATE.json'));
 const queue=JSON.parse(readGitText('HEAD','docs/RELEASE_QUEUE.json'));
 const opts={manifest,queue,branch:'refs/heads/'+manifest.candidate_branch,commitParent:readParents(frozen)[0],
  readGitText,sourceObjectAt,readParents,isAncestor,
  firstParentChangedPaths:sha=>git('diff','--name-only','--no-renames',sha+'^',sha).split(/\r?\n/).filter(Boolean)};
 assert.equal(isAncestor(manifest.published_source_sha,opts.commitParent),false);
 const selected=verifyGeneralProspectiveBatchReadyTestScope(opts);
 const runner='scripts/audit/isolated-sql-regression.sh';
 const fixture='supabase/tests/member_approval_finish_null_receipts.sql';
 assert.equal(manifest.selected_ready_item_ids.length,8);
 const historicalId='DIC-Q-509-member-approval-null-receipt-guard';
 const historical=queue.items.find(x=>x.id===historicalId);
 assert.ok(historical&&!Object.hasOwn(historical,'production_deployed'));
 for(const invalid of [true,null,'false',false]){
  const changed=structuredClone(queue);
  changed.items.find(x=>x.id===historicalId).production_deployed=invalid;
  assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,queue:changed}));
 }
 const removed=structuredClone(queue);
 const explicit=removed.items.find(x=>x.id!==historicalId&&manifest.selected_ready_item_ids.includes(x.id));
 assert.equal(explicit.production_deployed,false);
 delete explicit.production_deployed;
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,queue:removed}));
 assert.ok(selected.includes(runner)&&selected.includes(fixture));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,readParents:()=>[]}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,readParents:()=>['f'.repeat(40)]}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,readGitText:(r,p)=>
  r===manifest.published_source_sha&&p==='docs/RELEASE_CANDIDATE.json'?'{}':readGitText(r,p)}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(r,p)=>
  r==='HEAD'&&p===runner?'100644:'+'f'.repeat(40):sourceObjectAt(r,p)}));
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(r,p)=>
  r==='HEAD'&&p===fixture?'100644:'+'f'.repeat(40):sourceObjectAt(r,p)}));
});

// Reproduce the exact failed READY10 candidate using independent frozen Git objects.
// All required native jobs remain separate; this test proves only source-scope compatibility.
test('#3889 selected specialist workflows stay published and already-published audit checker remains exact',()=>{
 const frozen='a9deb5994796c3791ea7bcf4886af32cb4872495';
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:4000000,timeout:20000});
 const ref=r=>r==='HEAD'?frozen:r;
 const readGitText=(r,path)=>git('show',ref(r)+':'+path);
 const sourceObjectAt=(r,path)=>{
  const lines=git('ls-tree','-z',ref(r),'--',path).split('\0').filter(Boolean);
  if(!lines.length)return null;
  assert.equal(lines.length,1);
  const match=/^(100644|100755) blob ([a-f0-9]{40})\t(.+)$/.exec(lines[0]);
  assert.ok(match&&match[3]===path);
  return match[1]+':'+match[2];
 };
 const readParents=sha=>{
  const [commit,...parents]=git('rev-list','--parents','-n','1',sha).trim().split(/\s+/);
  assert.equal(commit,sha);return parents;
 };
 const isAncestor=(a,b)=>{
  try{execFileSync('git',['merge-base','--is-ancestor',a,b],{stdio:'ignore',timeout:15000});return true;}
  catch(e){if(e.status===1)return false;throw e;}
 };
 const manifest=JSON.parse(readGitText('HEAD','docs/RELEASE_CANDIDATE.json'));
 const queue=JSON.parse(readGitText('HEAD','docs/RELEASE_QUEUE.json'));
 const opts={manifest,queue,branch:'refs/heads/'+manifest.candidate_branch,commitParent:readParents(frozen)[0],
  readGitText,sourceObjectAt,readParents,isAncestor,
  firstParentChangedPaths:sha=>git('diff','--name-only','--no-renames',sha+'^',sha).split(/\r?\n/).filter(Boolean)};
 const workflow='.github/workflows/issue33-r232-original371-372.yml';
 const checker='scripts/audit/issue33-r232-original371-372-check.mjs';
 const regression='tests/coffee-issue33-r232-original371-372.test.mjs';
 const merge='b585b9cf646da868e6c7c8871289c82f6d96e6ca';
 assert.equal(manifest.selected_ready_item_ids.length,10);
 assert.equal(sourceObjectAt(manifest.published_source_sha,workflow),null);
 assert.equal(sourceObjectAt(manifest.published_source_sha,checker),sourceObjectAt(merge,checker));
 assert.equal(sourceObjectAt(merge+'^',checker),null);
 const selected=verifyGeneralProspectiveBatchReadyTestScope(opts);
 const runner='scripts/audit/isolated-sql-regression.sh';
 const coverage='tests/sql-runner-coverage.test.mjs';
 const prior=JSON.parse(readGitText(manifest.development_source_sha,'docs/READY_BATCH_CERTIFICATION.json')).candidate_sha;
 for(const path of [workflow,checker,regression,runner,coverage])assert.ok(selected.includes(path));
 for(const path of [runner,coverage]){
  const published=sourceObjectAt(manifest.published_source_sha,path);
  assert.ok(published);
  assert.equal(sourceObjectAt(prior,path),published);
  assert.equal(sourceObjectAt('HEAD',path),published);
  for(const r of [prior,'HEAD',manifest.development_source_sha])
   assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,p)=>
    ref===r&&p===path?'100644:'+'f'.repeat(40):sourceObjectAt(ref,p)}));
 }
 assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,manifest:{...manifest,
  restored_unpublished_workflow_paths:manifest.restored_unpublished_workflow_paths.filter(p=>p!==workflow)}}));
 for(const path of [workflow,checker,regression])assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,
  manifest:{...manifest,excluded_unready_test_paths:[...manifest.excluded_unready_test_paths,path]}}));
 for(const [r,p] of [['HEAD',workflow],[manifest.development_source_sha,workflow],['HEAD',checker],
  [manifest.development_source_sha,checker],[merge,checker],['HEAD',regression]])
  assert.throws(()=>verifyGeneralProspectiveBatchReadyTestScope({...opts,sourceObjectAt:(ref,path)=>
   ref===r&&path===p?'100644:'+'f'.repeat(40):sourceObjectAt(ref,path)}));
});
