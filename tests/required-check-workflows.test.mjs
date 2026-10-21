import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
