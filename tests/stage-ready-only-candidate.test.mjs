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
