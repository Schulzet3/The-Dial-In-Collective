import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFrozenTestingEvidence,WORKFLOWS} from '../scripts/release/verify-testing-frozen-evidence.mjs';
const sha=ch=>ch.repeat(40);
const C=sha('a'),D=sha('b'),P=sha('c'),M=sha('d'),T=sha('e'),
      S=sha('1'),Q=sha('2'),X=sha('3'),Y=sha('4'),Z=sha('5'),
      B=sha('6'),F='f'.repeat(64),R='release-candidates/testing3889-'+F.slice(0,20);
const selected='supabase/migrations/example.sql',qa='tests/a.test.mjs',restored='site/cloud/main.js';
const entry=(path,digest)=>({path,mode:'100644',type:'blob',sha:digest});
const tree=(digest,items)=>({sha:digest,truncated:false,tree:items});
function fixture(){
 const request={schema_version:1,kind:'DIC-TESTING-FROZEN-EVIDENCE-3889-V1',
  candidate_sha:C,candidate_branch:R,development_sha:D,published_sha:P,
  tree_sha:T,baseline_dev_sha:Z,baseline_queue_blob:B,manifest_blob:M,
  selected_id:'DIC-Q-509-example',selected_path:selected};
 const manifest={schema_version:1,kind:'DIC-TESTING-FROZEN-NONPUBLISHING-3889-V1',
  candidate_branch:R,development_source_sha:D,published_source_sha:P,
  baseline_dev_sha:Z,baseline_queue_blob:B,
  plan_fingerprint:F,selected_testing_item_id:request.selected_id,
  merged_source_sha:sha('7'),selected_blobs:[{path:selected,source_sha:'100644:'+S}],
  restored_to_published_paths:[restored],qa_compatibility_source_sha:D,
  qa_compatibility_blobs:[{path:qa,source_sha:'100644:'+Q}],
  status:'FROZEN_SOURCE_WITH_QA_COMPATIBILITY_CI_NOT_RUN',
  publication_authorized:false,certified_ready_count:0,selected_ready_item_ids:[]};
 const queue={items:[{id:request.selected_id,state:'TESTING',merged_source_sha:manifest.merged_source_sha,scope_paths:[selected]}]};
 const common=[entry('docs/RELEASE_QUEUE.json',B),entry('docs/ai/PREFLIGHT.md',Z)];
 const trees={
  candidate:tree(T,[...common,entry('docs/TESTING_3889_CANDIDATE.json',M),
   entry(selected,S),entry(qa,Q),entry(restored,X)]),
  development:tree(Y,[...common,entry(selected,S),entry(qa,Q),entry(restored,Y)]),
  published:tree(Z,[entry('docs/RELEASE_QUEUE.json',P),entry('docs/ai/PREFLIGHT.md',Z),
   entry(qa,X),entry(restored,X)])
 };
 const runs=WORKFLOWS.map((wf,i)=>({id:300+i,workflow_id:wf.id,name:wf.name,
  head_sha:C,head_branch:R,event:'push',status:'completed',conclusion:'success'}));
 const jobLists=Object.fromEntries(runs.map((r,i)=>[r.id,{
  total_count:WORKFLOWS[i].jobs.length,
  jobs:WORKFLOWS[i].jobs.map((name,j)=>({id:400+i*4+j,name,status:'completed',
   conclusion:'success',head_sha:C}))
 }]));
 return {request,branch:{ref:'refs/heads/'+R,object:{sha:C}},
  commit:{sha:C,tree:{sha:T},parents:[{sha:D}]},
  manifest,queue,trees,runList:{total_count:runs.length,workflow_runs:runs},
  jobLists,mergeTree:tree(sha('8'),[entry(selected,S)])};
}
const run=patch=>verifyFrozenTestingEvidence(patch??fixture());
const fail=(x,re)=>assert.throws(()=>run(x),re);
test('five distinct native PUSH successes and full frozen Git path isolation certify TESTING only',()=>{
 const r=run();assert.equal(r.status,'FIVE_PUSH_JOBS_AND_SOURCE_VERIFIED_TESTING_ONLY_NOT_READY');
 assert.equal(r.ready_promoted,false);assert.equal(r.publication_authorized,false);
 assert.equal(r.checks.length,5);
 assert.deepEqual(r.checks.map(x=>x.job),['approval','validate','cloud-tests','mobile-browser-qa','sql']);
 assert.equal(r.restored_paths,1);assert.equal(r.reviewed_qa_paths,1);
});
test('PR-only checks never substitute the exact candidate PUSH checks',()=>{
 const x=fixture();x.runList.workflow_runs.forEach(r=>r.event='pull_request');
 fail(x,/missing\/pending\/failed exact-SHA PUSH workflow/);
});
test('a missing workflow is an explicit HOLD even when other four jobs pass',()=>{
 const x=fixture();x.runList.workflow_runs.pop();x.runList.total_count--;
 fail(x,/missing\/pending\/failed exact-SHA PUSH workflow/);
});
test('latest pending check supersedes older successful run',()=>{
 const x=fixture(),r={...x.runList.workflow_runs[0],id:999,status:'in_progress',conclusion:null};
 x.runList.workflow_runs.push(r);x.runList.total_count++;
 fail(x,/missing\/pending\/failed exact-SHA PUSH workflow/);
});
test('a failed or skipped native job is never counted as success',()=>{
 for(const conclusion of ['failure','skipped','neutral',null]){
  const x=fixture();x.jobLists[301].jobs[0].conclusion=conclusion;
  fail(x,/missing\/pending\/failed\/NA native job/);
 }
});
test('a completed but failed run does not become a passing check',()=>{
 const x=fixture();x.runList.workflow_runs[1].conclusion='failure';
 fail(x,/missing\/pending\/failed exact-SHA PUSH workflow/);
});
test('incomplete workflow API pagination fails closed',()=>{
 const x=fixture();x.runList.total_count=200;fail(x,/incomplete or truncated/);
});
test('source branch movement and synthetic two-parent candidate are HOLD',()=>{
 const x=fixture();x.branch.object.sha=sha('9');fail(x,/candidate ref/);
 const y=fixture();y.commit.parents.push({sha:P});fail(y,/one-parent ancestry/);
});
test('selected merged code cannot be changed merely to satisfy an old test',()=>{
 const x=fixture();x.trees.candidate.tree.find(e=>e.path===selected).sha=X;
 fail(x,/selected path source/);
});
test('unselected application source differs from published: no unready contamination',()=>{
 const x=fixture();x.trees.candidate.tree.find(e=>e.path===restored).sha=Y;
 fail(x,/unselected executable differs from published baseline|restoration/);
});
test('extra unready source or omitted restored source in development cannot be hidden',()=>{
 const x=fixture();x.trees.development.tree.push(entry('site/cloud/unready.js',Q));
 fail(x,/development-to-published diff has missing\/extra/);
});
test('reviewed QA support must equal merged development, never publisher runtime',()=>{
 const x=fixture();x.trees.candidate.tree.find(e=>e.path===qa).sha=X;
 fail(x,/QA support lacks merged-source identity/);
});
test('publisher-shaped manifests and ready-selection forgers cannot pass',()=>{
 const x=fixture();x.manifest.selected_ready_item_ids=['DIC-Q-509-example'];
 fail(x,/manifest could be publisher-shaped/);
 const y=fixture();y.manifest.publication_authorized=true;fail(y,/manifest could be publisher-shaped/);
});
test('stale manifest Git blob or truncated source tree fails closed',()=>{
 const x=fixture();x.request.manifest_blob=sha('8');
 fail(x,/candidate queue\/governance/);
 const y=fixture();y.trees.published.truncated=true;fail(y,/truncated or missing/);
});
test('all paths and QA exclusions must be declared, distinct and source-bound',()=>{
 const x=fixture();x.manifest.restored_to_published_paths=[];
 fail(x,/restored source inventory/);
 const y=fixture();y.manifest.qa_compatibility_blobs[0].source_sha='100644:'+S;
 fail(y,/QA support lacks merged-source identity/);
});
