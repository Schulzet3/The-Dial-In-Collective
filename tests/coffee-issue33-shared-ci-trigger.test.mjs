// Issue #33 R319 / #508 N508-075: prove real shared-parser imports can trigger a
// bounded synthetic CI job without multiplying live original603 HTTP captures.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const yaml=readFileSync(new URL('../.github/workflows/issue33-shared-parser-regressions.yml',import.meta.url),'utf8');
test('shared parser and Add Coffee changes trigger the offline selected-source CI on PR and push',()=>{
  for(const source of [
    'src/server/coffee-*.mjs',
    'src/server/roast-level-evidence.mjs',
    'site/cloud/coffee-url-autofill.js',
    'site/cloud/main.js',
    'supabase/functions/_shared/html-scan.mjs',
    'scripts/audit/issue33-*.mjs'
  ])assert.equal(yaml.split(`- '${source}'`).length-1,2,source+' must trigger PR and push');
  assert.match(yaml,/pull_request:[\\s\\S]*?branches: \\[development\\/backend-foundation\\]/);
  assert.match(yaml,/push:[\\s\\S]*?branches: \\[development\\/backend-foundation\\]/);
  for(const n of ['r315-original63','r316-original71','r317-original79-80','r318-original91-92'])
    assert.match(yaml,new RegExp('tests/coffee-issue33-'+n+'\\\\.test\\\\.mjs'));
});
test('dependency-aware trigger is fail-closed on exact SHA and never runs live HTTP, production or a full frozen603 replay',()=>{
  assert.match(yaml,/git rev-parse HEAD/);
  assert.match(yaml,/DIC_EXPECTED_SHA/);
  assert.match(yaml,/persist-credentials: false/);
  assert.match(yaml,/node-version: '22'/);
  assert.doesNotMatch(yaml,/^\\s*run:.*issue33-original603-focused-source-review/m);
  assert.doesNotMatch(yaml,/workflow_dispatch:|schedule:|netlify|secrets\\./i);
});
