import test from 'node:test';
import assert from 'node:assert/strict';
import {docsOnlyPaths,classifyChanges,classifyImpactPaths} from '../scripts/audit/ci-scope.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
test('only Markdown documentation changes skip expensive CI',()=>{
 assert.equal(docsOnlyPaths(['docs/CURRENT_STATUS.md','docs/review/note.md']),true);
 assert.equal(docsOnlyPaths(['README.md']),true);
 for(const changed of [
  [],['docs/APPROVAL_COVERAGE_MATRIX.json'],['docs/CURRENT_STATUS.md','site/cloud/main.js'],
  ['AGENTS.md'],['.github/workflows/cloud-beta-ci.yml'],['supabase/migrations/new.sql'],
  ['docs/CURRENT_STATUS.md','scripts/release/controlled-release-runner.mjs'],
  ['docs/../site/main.md'],['docs/CURRENT_STATUS.md','package-lock.json']
 ])assert.equal(docsOnlyPaths(changed),false,JSON.stringify(changed));
});
test('Git diff classifier supports PR and push and fails closed on missing refs/errors',()=>{
 const run=(paths)=>((name,args)=>{assert.equal(name,'git');assert.equal(args[0],'diff');return paths.join('\n')+'\n';});
 assert.equal(classifyChanges({base:A,head:B,event:'push',git:run(['docs/CURRENT_STATUS.md'])}).docs_only,true);
 assert.equal(classifyChanges({base:A,head:B,event:'pull_request',git:run(['tests/ci-scope.test.mjs'])}).docs_only,false);
 assert.equal(classifyChanges({base:'0'.repeat(40),head:B,git:run(['docs/readme.md'])}).docs_only,false);
 assert.equal(classifyChanges({base:A,head:B,git:()=>{throw Error('diff failed');}}).docs_only,false);
});

test('Issue #267 exact post-pin evidence avoids duplicate full suites, unknown JSON fails closed',()=>{
 const safe=['docs/audits/issue267-v2-post-pin-tree-drift-20261105.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/D2-001.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/D2-999999.json'];
 const result=classifyImpactPaths([...safe,'docs/workstreams/issue-267.md']);
 assert.equal(result.docs_only,true);assert.equal(result.node_mode,'none');assert.equal(result.sql,false);
 for(const path of ['docs/audits/issue267-v2-post-pin-tree-drift-20261106.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/D2-0000000.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/D2-foo.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/D3-001.json',
  'docs/audits/issue267-v2-post-pin-direct-batches/../secret.json',
  'scripts/audit/ci-scope.mjs','.github/workflows/approval-continuity.yml']){
  const impact=classifyImpactPaths([path]);
  assert.equal(impact.docs_only,false,path);
  assert.equal(impact.tier,'high',path);
 }
});

import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('CLI emits a GitHub output value when run with a relative script path',()=>{
 const root=mkdtempSync(join(tmpdir(),'dic-ci-'));
 try{
  const path=join(root,'output');
  const result=spawnSync(process.execPath,['scripts/audit/ci-scope.mjs'],{
   encoding:'utf8',env:{...process.env,GITHUB_OUTPUT:path,DIC_CI_BASE:'0'.repeat(40),DIC_CI_HEAD:'1'.repeat(40)},timeout:5000
  });
  assert.equal(result.status,0,result.stderr);
  assert.ok(readFileSync(path,'utf8').split('\n').includes('docs_only=false'));
  assert.ok(readFileSync(path,'utf8').split('\n').includes('tier=high'));
 }finally{rmSync(root,{recursive:true,force:true});}
});
test('Issue #267 post-S2 historical Git-tree inventory delta stays docs-only without exempting unknown runtime',()=>{
 const listed=[
  'docs/audits/issue267-v2-post-pin-tree-drift-20261105-post-S2-148.json',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154.json',
  'docs/workstreams/ops-issue267-postpin-delta-s2-154-20261105.md'
 ];
 const recognized=classifyImpactPaths(listed);
 assert.equal(recognized.tier,'docs');assert.equal(recognized.docs_only,true);
 assert.equal(recognized.node_mode,'none');assert.equal(recognized.sql,false);
 assert.equal(recognized.browser_mode,'none');assert.equal(recognized.provider_guard,false);
 const current=classifyChanges({base:A,head:B,event:'pull_request',git:()=>listed.join('\n')+'\n'});
 assert.equal(current.reason,'NON_RUNTIME_ONLY');
 for(const invalid of [
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-15.json',
  'docs/audits/issue267-v2-post-pin-tree-drift-20261105-post-S2-x54.json',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154.json.bak',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154/../secret.json',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154.json/../secret.json',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154-runtime.json',
  'docs/audits/issue267-v2-post-pin-code-delta-20261105-post-S2-154.json',
  'docs/audits/issue267-v2-post-pin-drift-delta-20261105-post-S2-154.json.gz',
  'docs/audits/unexpected-new.json'
 ]){
  const v=classifyImpactPaths([invalid]);
  assert.equal(v.tier,'high',invalid);assert.equal(v.sql,true,invalid);
 }
 for(const runtime of ['scripts/audit/ci-scope.mjs',
  '.github/workflows/roaster-source-probe.yml',
  'supabase/migrations/new.sql','site/lib/engine.js','tests/ci-scope.test.mjs']){
  const mixed=classifyImpactPaths([...listed,runtime]);
  const bare=classifyImpactPaths([runtime]);
  assert.equal(mixed.tier,bare.tier,runtime);
  assert.equal(mixed.node_mode,bare.node_mode,runtime);
  assert.equal(mixed.sql,bare.sql,runtime);
 }
});
