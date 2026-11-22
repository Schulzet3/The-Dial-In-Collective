import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertBrowserFixtureClosure,fastSourceGuard} from '../scripts/audit/fast-pr-check.mjs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('cheap gate checks production graph and CloudApp browser fixture imports',()=>{
 const result=fastSourceGuard();
 assert.ok(result.shipped_js>10&&result.imported>10);
 const r=assertBrowserFixtureClosure(file('site/cloud/main.js'),file('tests/browser/cloud_owner_qa.py'));
 assert.ok(r.imported>10&&r.fixture_modules>=r.imported);
});
test('omitted browser fixture module fails before Chromium rather than after timeout',()=>{
 const main=file('site/cloud/main.js'),fixture=file('tests/browser/cloud_owner_qa.py');
 assert.throws(()=>assertBrowserFixtureClosure(main+"import {missing} from './new-startup-helper.js';\n",fixture),/missing imported CloudApp module/);
 assert.throws(()=>assertBrowserFixtureClosure(main,fixture.replace("'startup-recovery'","")),/startup-recovery/);
 assert.throws(()=>assertBrowserFixtureClosure(main+"import {\n missing\n} from './new-startup-helper.js';\n",fixture),/Unrecognized top-level/);
});
test('expensive CI runners reject cheap source/queue/receipt problems before installing',()=>{
 for(const workflow of ['cloud-beta-ci.yml','cloud-regression.yml']){
  const src=file('.github/workflows/'+workflow);
  const quick=src.indexOf('node scripts/audit/fast-pr-check.mjs');
  const intake=src.indexOf('node scripts/release/release-queue.mjs --enforce-intake',quick);
  const receipt=src.indexOf('node scripts/audit/verify-commit-checkpoint.mjs',quick);
  const expensive=src.indexOf('npm ci --ignore-scripts');
  assert.ok(quick>=0&&intake>quick&&receipt>intake&&expensive>receipt,workflow);
  assert.match(src,/DIC_HEAD_SHA: \$\{\{ github.event.pull_request.head.sha \|\| github.sha \}\}/);
 }
 const cloud=file('.github/workflows/cloud-regression.yml');
 assert.equal((cloud.match(/node scripts\/audit\/fast-pr-check.mjs/g)||[]).length,2);
 const approval=file('.github/workflows/approval-continuity.yml');
 assert.ok(approval.indexOf('node scripts/audit/verify-commit-checkpoint.mjs')<
  approval.indexOf('node scripts/release/ready-evidence-gate.mjs'));
});
