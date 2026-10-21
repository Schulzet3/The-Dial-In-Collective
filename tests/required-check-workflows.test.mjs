import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('all five required CI job checks run on EVERY private branch pull request',()=>{
 for(const p of ['.github/workflows/approval-continuity.yml','.github/workflows/cloud-beta-ci.yml',
  '.github/workflows/cloud-regression.yml','.github/workflows/visual-review.yml']){
  const src=file(p);
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
