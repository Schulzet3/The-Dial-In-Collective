import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
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
test('one immutable source-bound PR122 GitHub auto-merge receipt is accepted, never an arbitrary unmarked merge',()=>{
 const subject='Merge pull request #122 from Schulzet3/work/issue33-presentation-triage-20261026';
 const sha='644870aee66ad5c5f0bcdab0d4eeb66283cdd5fb';
 const paths=['scripts/audit/coffee-corpus-presentation-review.mjs','docs/workstreams/issue-33.md'];
 assert.deepEqual(auditLatestCommit({paths,subject,sha}),[]);
 assert.match(auditLatestCommit({paths,subject,sha:'c'.repeat(40)}).join(' '),/Unmarked commit/);
 assert.match(auditLatestCommit({paths,subject:subject+' changed',sha}).join(' '),/Unmarked commit/);
 assert.match(auditLatestCommit({paths:['site/cloud/main.js'],subject,sha}).join(' '),/SAME-COMMIT/);
});

test('GitHub merge with skip marker only in commit body is nonpublishing but still journal-bound',()=>{
 const subject='Merge pull request #382 from Schulzet3/fix/368-immutable-claim-suppress-git-cd-20261102';
 const message=subject+'\n\nfix(release): independently suppress Git CD [skip netlify]';
 const paths=['scripts/netlify/should-ignore-build.mjs','docs/workstreams/release-ready-batch.md'];
 assert.deepEqual(auditLatestCommit({paths,subject,message,sha:'a'.repeat(40)}),[]);
 assert.match(auditLatestCommit({paths,subject,message:subject,sha:'a'.repeat(40)}).join(' '),/Unmarked commit/);
 assert.match(auditLatestCommit({paths:[paths[0]],subject,message}).join(' '),/SAME-COMMIT/);
 assert.match(auditLatestCommit({paths,subject,message:subject+'\n\n[skip netlify-extra]'}).join(' '),/Unmarked commit/);
 const source=readFileSync(new URL('../scripts/audit/verify-commit-checkpoint.mjs',import.meta.url),'utf8');
 assert.match(source,/--format=%B/);
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

test('exact queue preparation journal is recognized without admitting arbitrary names',()=>{
 const subject='fix(release): source-bound queue prep [skip netlify]';
 const change=['scripts/release/release-queue.mjs','docs/workstreams/release-queue-prep-20261102.md'];
 assert.deepEqual(auditLatestCommit({paths:change,subject}),[]);
 const invalid=['docs/workstreams/release-queue-prep-20261103.md',
  'docs/workstreams/release-queue-prep.md','docs/workstreams/release-ready-batch-copy.md'];
 for(const path of invalid)
  assert.match(auditLatestCommit({paths:['scripts/release/release-queue.mjs',path],subject}).join(' '),/SAME-COMMIT/);
});
test('READY batch journal is explicitly scoped, without admitting arbitrary release journals',()=>{
 const subject='fix(ci): public CI build coordinates [skip netlify]';
 const code='.github/workflows/dic-ready-batch-certification.yml';
 assert.deepEqual(auditLatestCommit({paths:[code,'docs/workstreams/release-ready-batch.md'],subject}),[]);
 for(const invalid of ['docs/workstreams/release-ready-batch-copy.md','docs/workstreams/release-unknown.md','docs/workstreams/release-ready-batch.md.bak']){
  assert.match(auditLatestCommit({paths:[code,invalid],subject}).join(' '),/SAME-COMMIT/);
 }
 assert.match(auditLatestCommit({paths:[code,'docs/workstreams/release-ready-batch.md'],subject:'unmarked commit'}).join(' '),/Unmarked commit/);
});

test('actual Git merge body-only skip marker passes full-message audit without relaxing journal gate',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-continuity-body-'));
 const previous={cwd:process.cwd(),base:process.env.DIC_BASE_SHA,head:process.env.DIC_HEAD_SHA};
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init','-q','-b','main');git('config','user.name','Isolated continuity test');
  git('config','user.email','continuity@example.invalid');
  writeFileSync(join(dir,'base.md'),'Baseline');git('add','.');git('commit','-qm','Base [skip netlify]');
  git('checkout','-qb','feature');mkdirSync(join(dir,'scripts'));mkdirSync(join(dir,'docs'));
  mkdirSync(join(dir,'docs/workstreams'));
  writeFileSync(join(dir,'scripts','safe.mjs'),'export const safe=true;');
  writeFileSync(join(dir,'docs/workstreams','release-ready-batch.md'),'Contemporaneous code journal');
  git('add','.');git('commit','-qm','Safe feature [skip netlify]');
  git('checkout','-q','main');writeFileSync(join(dir,'main.md'),'Main note');
  git('add','.');git('commit','-qm','Main note [skip netlify]');
  const start=git('rev-parse','HEAD');
  git('merge','--no-ff','-m','Merge pull request #382\n\nNetlify skip in body [skip netlify]','feature');
  const head=git('rev-parse','HEAD');
  process.chdir(dir);process.env.DIC_BASE_SHA=start;process.env.DIC_HEAD_SHA=head;
  const receipt=verifyLatestCommit();
  assert.equal(receipt.commitCount,2,'range audits feature commit and merge commit');assert.equal(receipt.lastCommit,head);
 }finally{
  process.chdir(previous.cwd);
  if(previous.base===undefined)delete process.env.DIC_BASE_SHA;else process.env.DIC_BASE_SHA=previous.base;
  if(previous.head===undefined)delete process.env.DIC_HEAD_SHA;else process.env.DIC_HEAD_SHA=previous.head;
  rmSync(dir,{recursive:true,force:true});
 }
});
test('a real same-commit ops journal with a bounded uppercase run suffix counts, but arbitrary names do not',()=>{
 const code='site/lib/community-evidence.js',subject='fix: source and same-commit journal [skip netlify]';
 const documented='docs/workstreams/ops-issue267-disjoint-f143-p116-20261106-N12.md';
 assert.deepEqual(auditLatestCommit({sha:'4b4984dc81d64d835648172dd6daa201f326f041',paths:[code,documented],subject}),[]);
 for(const invalid of ['docs/workstreams/ops-issue267-disjoint-f143-p116-20261106-N0.md',
  'docs/workstreams/ops-issue267-disjoint-f143-p116-20261106-Nabc.md',
  'docs/workstreams/ops-issue267-disjoint-f143-p116-20261106-N12.md.bak',
  'docs/workstreams/ops-issue267-disjoint-f143-p116-20261106-UNCHECKED.md']){
  assert.match(auditLatestCommit({paths:[code,invalid],subject}).join(' '),/SAME-COMMIT/);
 }
 assert.match(auditLatestCommit({paths:[code],subject}).join(' '),/SAME-COMMIT/);
});


test('PR base drift audits only feature commits; push ancestry stays strict',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-continuity-drift-'));
 const env={cwd:process.cwd(),base:process.env.DIC_BASE_SHA,
  head:process.env.DIC_HEAD_SHA,event:process.env.DIC_EVENT_NAME};
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init','-q','-b','main');git('config','user.name','Continuity fixture');
  git('config','user.email','continuity@example.invalid');
  writeFileSync(join(dir,'base.md'),'baseline\n');git('add','.');git('commit','-qm','Base [skip netlify]');
  git('checkout','-qb','feature');mkdirSync(join(dir,'scripts'));mkdirSync(join(dir,'docs/workstreams'),{recursive:true});
  writeFileSync(join(dir,'scripts/feature.mjs'),'export const feature=true;\n');
  writeFileSync(join(dir,'docs/workstreams/issue-457.md'),'Contemporaneous journal\n');
  git('add','.');git('commit','-qm','Good feature [skip netlify]');
  const feature=git('rev-parse','HEAD');
  git('checkout','-q','main');writeFileSync(join(dir,'concurrent.md'),'Unrelated main advance\n');
  git('add','.');git('commit','-qm','Concurrent docs [skip netlify]');
  const advanced=git('rev-parse','HEAD');
  process.chdir(dir);process.env.DIC_BASE_SHA=advanced;process.env.DIC_HEAD_SHA=feature;
  process.env.DIC_EVENT_NAME='pull_request';
  const result=verifyLatestCommit();
  assert.equal(result.commitCount,1);
  assert.equal(result.lastCommit,feature);
  assert.equal(result.checkedPaths,2,'only PR exclusive source and journal are audited');
  process.env.DIC_EVENT_NAME='push';
  assert.throws(()=>verifyLatestCommit(),/Git commit range unavailable/,'push keeps strict ancestry');
 }finally{
  process.chdir(env.cwd);
  for(const [k,v] of [['DIC_BASE_SHA',env.base],['DIC_HEAD_SHA',env.head],['DIC_EVENT_NAME',env.event]]){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
  rmSync(dir,{recursive:true,force:true});
 }
});
test('PR base drift does not exempt missing same-commit journals or unmarked commits',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-continuity-drift-negative-'));
 const env={cwd:process.cwd(),base:process.env.DIC_BASE_SHA,
  head:process.env.DIC_HEAD_SHA,event:process.env.DIC_EVENT_NAME};
 const git=(...args)=>execFileSync('git',['-C',dir,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 try{
  git('init','-q','-b','main');git('config','user.name','Continuity fixture');
  git('config','user.email','continuity@example.invalid');
  writeFileSync(join(dir,'base.md'),'baseline\n');git('add','.');git('commit','-qm','Base [skip netlify]');
  git('checkout','-qb','feature');mkdirSync(join(dir,'scripts'));
  writeFileSync(join(dir,'scripts/untracked.mjs'),'export const x=1;\n');
  git('add','.');git('commit','-qm','Missing journal [skip netlify]');
  const bad=git('rev-parse','HEAD');
  git('checkout','-q','main');writeFileSync(join(dir,'concurrent.md'),'main moved\n');
  git('add','.');git('commit','-qm','Base moved [skip netlify]');
  process.chdir(dir);
  process.env.DIC_EVENT_NAME='pull_request';process.env.DIC_BASE_SHA=git('rev-parse','HEAD');
  process.env.DIC_HEAD_SHA=bad;
  assert.throws(()=>verifyLatestCommit(),/SAME-COMMIT.*scripts\/untracked\.mjs/);
  git('checkout','-q','feature');mkdirSync(join(dir,'docs/workstreams'),{recursive:true});
  writeFileSync(join(dir,'docs/workstreams/issue-457.md'),'journal\n');
  git('add','.');git('commit','-qm','Unmarked journal');
  process.env.DIC_HEAD_SHA=git('rev-parse','HEAD');
  assert.throws(()=>verifyLatestCommit(),/Unmarked commit/);
 }finally{
  process.chdir(env.cwd);
  for(const [k,v] of [['DIC_BASE_SHA',env.base],['DIC_HEAD_SHA',env.head],['DIC_EVENT_NAME',env.event]]){
   if(v===undefined)delete process.env[k];else process.env[k]=v;
  }
  rmSync(dir,{recursive:true,force:true});
 }
});
test('approval keeps queue schema/intake and PR-head continuity without redundant status process',()=>{
 const src=readFileSync(new URL('../.github/workflows/approval-continuity.yml',import.meta.url),'utf8');
 assert.match(src,/DIC_EVENT_NAME: \$\{\{ github\.event_name \}\}/);
 assert.match(src,/DIC_HEAD_SHA: \$\{\{ github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
 assert.match(src,/scripts\/release\/release-queue\.mjs --enforce-intake/);
 assert.doesNotMatch(src,/scripts\/release\/release-queue\.mjs --status/);
 assert.doesNotMatch(src,/scripts\/release\/release-queue\.mjs --validate/);
 assert.match(src,/node scripts\/audit\/verify-commit-checkpoint\.mjs/);
});
