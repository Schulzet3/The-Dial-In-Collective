import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {stageReadyOnlyCandidate} from '../scripts/release/stage-ready-only-candidate.mjs';
const qBase={schema_version:1,authority:'OPS-AUTONOMOUS-BUILD-TEST-QUEUE-20261022',
 published_base:{tested_source_sha:'a'.repeat(40),release_sha:'b'.repeat(40),netlify_deploy_id:'fixture'},
 items:[],history:[]};
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'dic-candidate-integration-'));
 const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const write=(path,text)=>{mkdirSync(join(root,path.slice(0,path.lastIndexOf('/'))),{recursive:true});writeFileSync(join(root,path),text);};
 git('init','-q','-b','development/backend-foundation');
 git('config','user.name','DIC candidate fixture');git('config','user.email','fixture@example.com');
 write('site/card.js','published card\n');
 write('src/server/extractor.mjs','published extractor\n');
 write('docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md','# Fixture journal\n');
 write('docs/RELEASE_QUEUE.json',JSON.stringify(qBase,null,2)+'\n');
 git('add','-A');git('commit','-qm','Published synthetic baseline [skip netlify]');
 const published=git('rev-parse','HEAD');
 write('site/card.js','new READY card\n');
 git('add','-A');git('commit','-qm','READY card merge [skip netlify]');
 const readyMerge=git('rev-parse','HEAD');
 const ready={id:'DIC-Q-100',issue:100,title:'Synthetic READY card',state:'READY',
  owner_source:'https://github.com/example/repo/issues/100',merged_source_sha:readyMerge,
  scope_paths:['site/card.js'],tests:['synthetic PASS'],ci_runs:[12345],blockers:[]};
 const unfinished={...ready,id:'DIC-Q-101',issue:101,title:'Unfinished extractor',
  state:'IN_PROGRESS',merged_source_sha:null,scope_paths:['src/server/extractor.mjs'],
  tests:[],ci_runs:[],blockers:['awaiting review']};
 const queue={...qBase,published_base:{...qBase.published_base,tested_source_sha:published},
  items:[ready,unfinished]};
 write('docs/RELEASE_QUEUE.json',JSON.stringify(queue,null,2)+'\n');
 write('src/server/extractor.mjs','unready extractor\n');
 git('add','-A');git('commit','-qm','Unready source plus exact queue [skip netlify]');
 return {root,git,write,published,readyMerge,queue,development:git('rev-parse','HEAD')};
}
const stage=(f,tag='candidate-ready-only')=>stageReadyOnlyCandidate({repoDir:f.root,
 developmentSourceSha:f.development,selectedIds:['DIC-Q-100'],
 branch:'release-candidates/'+tag});
test('real Git staging restores only unfinished code, preserves READY content and exact parent',()=>{
 const f=fixture();
 try{
  const result=stage(f);
  const sha=result.candidate_sha;
  assert.match(sha,/^[a-f0-9]{40}$/);
  assert.deepEqual(result.plan.included_paths,['site/card.js']);
  assert.deepEqual(result.plan.restored_paths,['src/server/extractor.mjs']);
  assert.equal(f.git('show',sha+':site/card.js'),'new READY card');
  assert.equal(f.git('show',sha+':src/server/extractor.mjs'),'published extractor');
  assert.equal(f.git('show',f.development+':src/server/extractor.mjs'),'unready extractor');
  assert.equal(f.git('rev-parse','release-candidates/candidate-ready-only'),sha);
  assert.equal(f.git('rev-list','--parents','-n','1',sha).split(/\s+/)[1],f.development);
  const manifest=JSON.parse(f.git('show',sha+':docs/RELEASE_CANDIDATE.json'));
  assert.equal(manifest.publication_authorized,false);
  assert.deepEqual(manifest.selected_ready_item_ids,['DIC-Q-100']);
  assert.deepEqual(manifest.restored_to_published_paths,['src/server/extractor.mjs']);
  assert.match(f.git('log','-1','--format=%B',sha),/\[skip netlify\]/);
  assert.match(f.git('show',sha+':docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md'),/not published/);
  assert.equal(f.git('rev-parse','development/backend-foundation'),f.development,'staging never rewrites development');
  assert.throws(()=>stage(f),/update-ref|already exists/,'cannot silently duplicate a candidate ref');
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('real staging refuses an unready change to the same READY file',()=>{
 const f=fixture();
 try{
  f.write('site/card.js','later untracked change\n');
  f.git('add','-A');f.git('commit','-qm','Post-READY untracked same-file edit [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  assert.throws(()=>stage(f,'post-ready-denied'),/unapproved same-file content after READY merge/);
  assert.throws(()=>f.git('rev-parse','release-candidates/post-ready-denied'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('real staging refuses READY versus unready same-file overlap',()=>{
 const f=fixture();
 try{
  f.queue.items[1].scope_paths=['site/card.js'];
  f.write('docs/RELEASE_QUEUE.json',JSON.stringify(f.queue,null,2)+'\n');
  f.git('add','-A');f.git('commit','-qm','Track unready same-file overlap [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  assert.throws(()=>stage(f,'overlap-denied'),/overlap/);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('zero READY items never creates a staging ref',()=>{
 const f=fixture();
 try{
  assert.throws(()=>stageReadyOnlyCandidate({repoDir:f.root,developmentSourceSha:f.development,
   selectedIds:[],branch:'release-candidates/empty-denied'}),/READY-only staging HOLD/);
  assert.throws(()=>f.git('rev-parse','release-candidates/empty-denied'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('two sequential isolated releases preserve next READY source even when merged before prior publish',()=>{
 const f=fixture();
 try{
  // The second feature was merged and independently READY before the first
  // feature shipped, but the first candidate intentionally excluded it.
  const other=f.queue.items[1];
  f.queue.items[1]={...other,state:'READY',merged_source_sha:f.development,
   tests:['scoped tests PASS'],ci_runs:[34567],blockers:[]};
  f.write('docs/RELEASE_QUEUE.json',JSON.stringify(f.queue,null,2)+'\n');
  f.git('add','-A');f.git('commit','-qm','Certify second READY before first release [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  const first=stageReadyOnlyCandidate({repoDir:f.root,developmentSourceSha:f.development,
   selectedIds:['DIC-Q-100'],branch:'release-candidates/first-ready-published'});
  assert.deepEqual(first.plan.included_paths,['site/card.js']);
  assert.deepEqual(first.plan.restored_paths,['src/server/extractor.mjs']);
  // The source-isolated publication is a child of development, not an
  // ancestor until we reconcile it with a no-code-change SECOND-parent merge.
  f.git('merge','-s','ours','--no-ff','-m','Acknowledge published candidate without source changes [skip netlify]',first.candidate_sha);
  assert.equal(f.git('show','HEAD:src/server/extractor.mjs'),'unready extractor');
  f.queue.published_base.tested_source_sha=first.candidate_sha;
  f.queue.items[0].state='DEPLOYED';
  f.write('docs/RELEASE_QUEUE.json',JSON.stringify(f.queue,null,2)+'\n');
  f.git('add','-A');f.git('commit','-qm','Settle published baseline and retain unpublished READY [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  const second=stageReadyOnlyCandidate({repoDir:f.root,developmentSourceSha:f.development,
   selectedIds:['DIC-Q-101'],branch:'release-candidates/second-ready-published'});
  assert.deepEqual(second.plan.included_paths,['src/server/extractor.mjs']);
  assert.deepEqual(second.plan.restored_paths,[]);
  assert.equal(f.git('show',second.candidate_sha+':site/card.js'),'new READY card');
  assert.equal(f.git('show',second.candidate_sha+':src/server/extractor.mjs'),'unready extractor');
  assert.equal(f.git('rev-parse','development/backend-foundation'),f.development,
   'staging did not mutate development');
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('real staging excludes newly added unready GitHub workflow while retaining only selected READY app source',()=>{
 const f=fixture();
 try{
  const workflow='.github/workflows/unpublished-test-only.yml';
  f.write(workflow,'name: unpublished audit\non: push\njobs: {}\n');
  f.git('add','-A');f.git('commit','-qm','Unpublished development-only workflow [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  const staged=stage(f,'workflow-restored');
  assert.deepEqual(staged.manifest.restored_unpublished_workflow_paths,[workflow]);
  assert.throws(()=>f.git('show',staged.candidate_sha+':'+workflow));
  assert.match(f.git('show',f.development+':'+workflow),/unpublished audit/);
  assert.equal(f.git('show',staged.candidate_sha+':site/card.js'),'new READY card');
  assert.equal(f.git('rev-parse','development/backend-foundation'),f.development);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});


test('#2169 real disposable Git staged candidate removes only newly introduced restored-work tests',()=>{
 const f=fixture();
 try{
  f.write('tests/issue101-unready-parser.test.mjs','import test from "node:test";\ntest("requires unpublished extractor",()=>{});\n');
  f.write('tests/issue102-unrelated.test.mjs','import test from "node:test";\ntest("unrelated is never silently omitted",()=>{});\n');
  f.git('add','-A');f.git('commit','-qm','Unready tests after READY merge [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  const staged=stage(f,'unready-tests-source-bound');
  assert.deepEqual(staged.manifest.excluded_unready_test_paths,['tests/issue101-unready-parser.test.mjs']);
  assert.throws(()=>f.git('show',staged.candidate_sha+':tests/issue101-unready-parser.test.mjs'));
  assert.match(f.git('show',staged.candidate_sha+':tests/issue102-unrelated.test.mjs'),/unrelated/);
  assert.match(f.git('show',f.development+':tests/issue101-unready-parser.test.mjs'),/unpublished extractor/);
  assert.equal(f.git('rev-parse','development/backend-foundation'),f.development);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});

test('#2169 real staging denies missing static relative import before creating candidate ref',()=>{
 const f=fixture();
 try{
  f.write('site/card.js',"import './missing-dependency.js';\nexport const ready=1;\n");
  f.git('add','-A');f.git('commit','-qm','Approved source with missing import [skip netlify]');
  f.queue.items[0].merged_source_sha=f.git('rev-parse','HEAD');
  f.write('docs/RELEASE_QUEUE.json',JSON.stringify(f.queue,null,2)+'\n');
  f.git('add','-A');f.git('commit','-qm','Queue cites exact READY source [skip netlify]');
  f.development=f.git('rev-parse','HEAD');
  assert.throws(()=>stage(f,'import-missing-denied'),/Unresolved static relative module import/);
  assert.throws(()=>f.git('rev-parse','release-candidates/import-missing-denied'));
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
test('#2169 staged risk record has one build and exactly five required statuses for app',()=>{
 const f=fixture();
 try{
  const staged=stage(f,'risk-real-source');
  assert.equal(staged.manifest.risk_classification.builds,1);
  assert.deepEqual(staged.manifest.risk_classification.checks,
   ['approval','validate','cloud-tests','mobile-browser-qa','sql']);
 }finally{rmSync(f.root,{recursive:true,force:true});}
});
