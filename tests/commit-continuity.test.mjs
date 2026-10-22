import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {auditLatestCommit,auditCommitRange,verifyLatestCommit} from '../scripts/audit/verify-commit-checkpoint.mjs';
const checkpoint='docs/ACTIVE_WORK_2026-10-20_APPROVAL_TO_RELEASE_INTEGRITY.md';
test('source changes without same-commit durable checkpoint are blocked',()=>{
 assert.match(auditLatestCommit({paths:['site/cloud/main.js'],subject:'fix: button [skip netlify]'}).join(' '),/lacks SAME-COMMIT/);
});
test('source changes with same-commit work journal pass',()=>{
 assert.deepEqual(auditLatestCommit({paths:['site/cloud/main.js',checkpoint],subject:'fix: approved control [skip netlify]'}),[]);
});
test('doc-only commits without skip are blocked; docs with skip are accepted',()=>{
 assert.ok(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'docs: status'}).length);
 assert.deepEqual(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'docs: status [skip netlify]'}),[]);
});
test('release marker cannot sneak code changes into a production publish commit',()=>{
 assert.match(auditLatestCommit({paths:['site/cloud/main.js',checkpoint],subject:'Release DIC: approved UI [dic-publish]'}).join(' '),/only contain reviewed documentation/);
 assert.deepEqual(auditLatestCommit({paths:['docs/CURRENT_STATUS.md'],subject:'Release DIC: owner approved [dic-publish]'}),[]);
});

test('bad first commit is not concealed by a later docs-only commit in the same push',()=>{
 const batch=[{sha:'first',paths:['site/cloud/main.js'],subject:'feat: no journal [skip netlify]'},
  {sha:'second',paths:['docs/CURRENT_STATUS.md'],subject:'docs: handoff [skip netlify]'}];
 assert.match(auditCommitRange(batch).join(' '),/first:.*SAME-COMMIT/);
});
test('every source-changing commit with its own journal passes range audit',()=>{
 assert.deepEqual(auditCommitRange([
  {sha:'first',paths:['site/lib/engine.js',checkpoint],subject:'fix: engine [skip netlify]'},
  {sha:'second',paths:['site/cloud/main.js',checkpoint],subject:'fix: UI [skip netlify]'},
  {sha:'third',paths:['docs/CURRENT_STATUS.md'],subject:'docs: complete [skip netlify]'}
 ]),[]);
});

test('SQL migrations, SQL tests, shared source and lint rules require the same-commit journal',()=>{
 for(const path of ['supabase/migrations/20990101000000_example.sql','supabase/tests/example.sql',
  'src/shared/example.mjs','eslint.config.mjs','.github/actions/local/action.yml']){
  assert.match(auditLatestCommit({paths:[path],subject:'fix [skip netlify]'}).join(' '),/SAME-COMMIT/);
  assert.deepEqual(auditLatestCommit({paths:[path,checkpoint],subject:'fix [skip netlify]'}),[]);
 }
});

test('a real merge-only code change cannot disappear from continuity inspection',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-continuity-merge-'));
 const previous={cwd:process.cwd(),base:process.env.DIC_BASE_SHA,head:process.env.DIC_HEAD_SHA};
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init','-q','-b','main');git('config','user.name','Isolated continuity test');
  git('config','user.email','continuity@example.invalid');
  mkdirSync(join(dir,'site'));writeFileSync(join(dir,'site/config.js'),'export const value=1;\n');
  git('add','.');git('commit','-qm','Fixture base [skip netlify]');
  git('checkout','-qb','feature');writeFileSync(join(dir,'feature.md'),'Feature notes\n');
  git('add','.');git('commit','-qm','Feature notes [skip netlify]');
  git('checkout','-q','main');writeFileSync(join(dir,'main.md'),'Main notes\n');
  git('add','.');git('commit','-qm','Main notes [skip netlify]');
  const base=git('rev-parse','HEAD');
  git('merge','--no-ff','--no-commit','feature');
  writeFileSync(join(dir,'site/config.js'),'export const value=2;\n');git('add','.');
  git('commit','-qm','Merge resolution [skip netlify]');
  const head=git('rev-parse','HEAD');
  process.chdir(dir);process.env.DIC_BASE_SHA=base;process.env.DIC_HEAD_SHA=head;
  assert.throws(()=>verifyLatestCommit(),error=>{
   assert.match(error.message,/SAME-COMMIT.*site\/config\.js/);
   assert.ok(error.message.includes(head));return true;
  });
 }finally{
  process.chdir(previous.cwd);
  if(previous.base===undefined)delete process.env.DIC_BASE_SHA;else process.env.DIC_BASE_SHA=previous.base;
  if(previous.head===undefined)delete process.env.DIC_HEAD_SHA;else process.env.DIC_HEAD_SHA=previous.head;
  rmSync(dir,{recursive:true,force:true});
 }
});

const scoped='docs/workstreams/issue-80.md';
test('an indexed scoped work journal satisfies same-commit continuity',()=>{
 assert.deepEqual(auditLatestCommit({paths:['site/cloud/main.js',scoped],subject:'fix: independent save [skip netlify]'}),[]);
});
test('unindexed docs cannot satisfy a same-commit code checkpoint',()=>{
 for(const fake of ['docs/workstreams/README.md','docs/notes.md','docs/workstreams/issue-.md'])
  assert.match(auditLatestCommit({paths:['site/cloud/main.js',fake],subject:'fix [skip netlify]'}).join(' '),/SAME-COMMIT/);
});
