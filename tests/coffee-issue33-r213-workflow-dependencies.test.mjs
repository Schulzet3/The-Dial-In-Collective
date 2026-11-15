import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=readFileSync(new URL('../.github/workflows/issue33-r213-original322-324.yml',import.meta.url),'utf8');
const [pr,pushAndPermissions='']=text.split(/^  push:\s*$/m);
const push=pushAndPermissions.split(/^permissions:\s*$/m)[0];
const dep=[
 'scripts/audit/issue33-original603-focused-source-review.mjs',
 'scripts/audit/issue33-selected-product-heading.mjs',
 'src/server/coffee-product-scope.mjs',
 'docs/workstreams/ops-issue33-r213-322-324-20261115.md',
 'tests/coffee-issue33-r213-workflow-dependencies.test.mjs'
];
test('R213 selected source workflow PR/push filters include real executed inputs and journal',()=>{
 for(const p of dep){
  const row='      - '+p;
  assert.ok(pr.includes(row),'PR omitted '+p);
  assert.ok(push.includes(row),'push omitted '+p);
 }
});
test('R213 source workflow still exercises frozen exact cases and the path-filter regression',()=>{
 assert.match(text,/DIC_ISSUE33_FOCUSED_PUBLIC_NUMBERS:\s*'322,323,324'/);
 assert.match(text,/node --test tests\/coffee-issue33-r213-original322-324\.test\.mjs/);
 assert.match(text,/node --test tests\/coffee-issue33-r213-workflow-dependencies\.test\.mjs/);
 assert.match(text,/node scripts\/audit\/issue33-original603-focused-source-review\.mjs/);
 assert.match(text,/node scripts\/audit\/issue33-r213-original322-324-check\.mjs/);
});
