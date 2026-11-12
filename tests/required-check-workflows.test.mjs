import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('all five required CI job checks run on EVERY private branch pull request',()=>{
 const jobs={approval:'approval-continuity',validate:'cloud-beta-ci',
  'cloud-tests':'cloud-regression','mobile-browser-qa':'cloud-regression',sql:'isolated-sql-regression'};
 for(const [job,workflow] of Object.entries(jobs)){
  const p='.github/workflows/'+workflow+'.yml';
  const src=file(p);
  assert.match(src,new RegExp('\\n  '+job+':\\s*\\n'),p+' lacks actual required job '+job);
  assert.match(src,/pull_request:\s*\n\s*branches:/,p+' lacks all PR trigger');
  const pr=src.split('pull_request:')[1].split(/\n\s*(workflow_dispatch|permissions|concurrency|jobs):/)[0];
  assert.doesNotMatch(pr,/\n\s*paths:/,p+' blocks docs-only PR required CI');
 }
});
test('SQL-only push revisions run required validate rather than silently omitting fifth check',()=>{
 const src=file('.github/workflows/cloud-beta-ci.yml');
 const push=src.split('\n  push:')[1]?.split('\n  pull_request:')[0]||'';
 assert.match(push,/branches:\s*\n\s*- development\/backend-foundation/);
 for(const path of ['supabase/migrations/**','supabase/tests/**']){
  assert.ok(push.includes("      - '"+path+"'"),'Missing validate push trigger for '+path);
 }
 assert.equal((push.match(/supabase\/migrations\/\*\*/g)||[]).length,1);
 assert.equal((push.match(/supabase\/tests\/\*\*/g)||[]).length,1);
});

test('per-commit continuity checks head SHA, not synthetic PR merge SHA',()=>{
 const src=file('.github/workflows/approval-continuity.yml');
 assert.match(src,/DIC_HEAD_SHA: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
 assert.match(src,/fetch-depth: 0/);
});

test('required validation exercises Netlify ignore on Node 18 before the Node 22 app build',()=>{
 const src=file('.github/workflows/cloud-beta-ci.yml');
 const ignoreRuntime=src.indexOf("node-version: '18.20.8'");
 const ignoreTests=src.indexOf('node --test tests/netlify-credit-guard.test.mjs tests/one-use-claim.test.mjs');
 const appRuntime=src.indexOf("node-version: '22'");
 const install=src.indexOf('npm ci --ignore-scripts');
 assert.ok(ignoreRuntime>=0&&ignoreRuntime<ignoreTests&&ignoreTests<appRuntime&&appRuntime<install,
  'ignore tests must run without app dependencies on the provider runtime before switching back');
});

test('operational READY audit stays mandatory on development; candidates retain exact published workflow bytes',()=>{
 const path='.github/workflows/approval-continuity.yml';
 const src=file(path);
 const ref=process.env.GITHUB_REF||'';
 if(ref.startsWith('refs/heads/release-candidates/')&&
    /^[a-z0-9][a-z0-9-]{2,80}$/.test(ref.slice('refs/heads/release-candidates/'.length))){
  const manifest=JSON.parse(file('docs/RELEASE_CANDIDATE.json'));
  assert.equal(manifest.kind,'DIC-READY-ONLY-SOURCE-1');
  assert.equal(manifest.publication_authorized,false);
  assert.equal('refs/heads/'+manifest.candidate_branch,ref);
  assert.match(manifest.published_source_sha,/^[a-f0-9]{40}$/);
  assert.ok(manifest.restored_unpublished_workflow_paths?.includes(path),
   'isolation must declare restoration of the mandatory development workflow');
  const actualPublished=execFileSync('git',['show',manifest.published_source_sha+':'+path],
   {encoding:'utf8',timeout:15000,maxBuffer:30000});
  assert.equal(src,actualPublished,'candidate workflow must match exact published Git blob');
  return;
 }
 assert.ok(src.includes('run: node scripts/release/ready-evidence-gate.mjs'),
  'development READY audit must be operational');
 assert.match(src,/actions: read/);
 assert.match(src,/checks: read/);
});
