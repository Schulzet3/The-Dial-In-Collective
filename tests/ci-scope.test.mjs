import test from 'node:test';
import {frozenExcludedReadySource} from './helpers/release-published-restoration.mjs';
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

// #3667 owner speed-first: no full app/browser/SQL suite for narrowly proven CI-only paths.
test('known non-shipped CI diagnostic changes take the focused QA-only route',()=>{
 const paths=['tests/ci-optimization.test.mjs','tests/ci-scope.test.mjs',
  'tests/fast-pr-check.test.mjs','scripts/audit/fast-pr-check.mjs',
  'scripts/audit/measure-stage.mjs','scripts/audit/syntax-batch.mjs'];
 for(const path of paths){
  const scoped=classifyImpactPaths([path,'docs/workstreams/issue-3667.md']);
  assert.equal(scoped.tier,'low',path);
  assert.equal(scoped.node_mode,'qa',path);
  assert.equal(scoped.sql,false,path);
  assert.equal(scoped.cloud_mode,'none',path);
  assert.equal(scoped.browser_mode,'none',path);
  assert.equal(scoped.lint,false,path);
  assert.equal(scoped.build_browser||scoped.build_validate,false,path);
  assert.equal(scoped.provider_guard,false,path);
 }
});
test('mixed changes, unknown paths and sensitive CI remain conservatively covered',()=>{
 for(const source of ['site/cloud/main.js','supabase/migrations/new.sql',
  '.github/workflows/cloud-beta-ci.yml','scripts/audit/ci-scope.mjs',
  'scripts/release/ready-promotion-gate.mjs','tests/auth-new.test.mjs',
  'scripts/audit/unknown-regression.mjs']){
  const impact=classifyImpactPaths([source,'tests/ci-optimization.test.mjs']);
  assert.equal(impact.tier,'high',source);
  assert.equal(impact.node_mode,'full',source);
  assert.equal(impact.browser_mode,source.endsWith('.sql')?'none':'high',source);
  assert.equal(impact.sql,true,source);
 }
 assert.equal(classifyImpactPaths(['docs/CURRENT_STATUS.md']).tier,'docs');
 assert.equal(classifyImpactPaths(['site/cloud/main.js']).tier,'high');
});

test('official PR and push QA-only path stays focused, frozen candidate remains conservative',()=>{
 const paths=['docs/ai/PREFLIGHT.md','docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md',
  'docs/workstreams/issue-3667.md','tests/ci-scope.test.mjs'];
 const git=()=>paths.join('\n')+'\n';
 for(const event of ['pull_request','push']){
  const impact=classifyChanges({base:A,head:B,event,git});
  assert.equal(impact.node_mode,'qa',event);
  assert.equal(impact.tier,'low',event);
  assert.equal(impact.sql,false,event);
  assert.equal(impact.browser_mode,'none',event);
  assert.equal(impact.build_browser||impact.build_validate,false,event);
 }
 const candidate=classifyChanges({base:A,head:B,event:'candidate',git});
 assert.equal(candidate.tier,'high');
 assert.equal(candidate.node_mode,'full');
});

test('source-bound approval push jobs cannot be canceled by unrelated later push',(t)=>{
 if(frozenExcludedReadySource(['package.json','.github/workflows/cloud-beta-ci.yml','.github/workflows/cloud-regression.yml'])){
  t.skip('NOT_APPLICABLE: exact published unselected source restored; #3781 admission coverage remains active');return;
 }

 const yaml=readFileSync(new URL('../.github/workflows/approval-continuity.yml',import.meta.url),'utf8');
 assert.ok(yaml.includes("group: dic-approval-continuity-${{ github.ref }}-${{ github.event_name == 'push' && github.sha || 'pr' }}"));
 assert.ok(yaml.includes("cancel-in-progress: ${{ github.event_name != 'push' }}"));
 const group=(event,ref,head)=>ref+'-'+(event==='push'?head:'pr');
 const ref='refs/heads/development/backend-foundation';
 assert.notEqual(group('push',ref,A),group('push',ref,B),'independent SHA-bound pushes');
 assert.equal(group('pull_request','refs/pull/123/merge',A),group('pull_request','refs/pull/123/merge',B),'superseded PR jobs still coalesce');
 assert.equal(classifyImpactPaths(['.github/workflows/approval-continuity.yml']).tier,'high');
});

test('exact-SHA development cloud and browser push checks finish despite subsequent pushes',(t)=>{
 if(frozenExcludedReadySource(['package.json','.github/workflows/cloud-beta-ci.yml','.github/workflows/cloud-regression.yml'])){
  t.skip('NOT_APPLICABLE: exact published unselected source restored; #3781 admission coverage remains active');return;
 }

 for(const [filename,prefix] of [
  ['cloud-beta-ci.yml','dic-cloud-beta-ci'],
  ['cloud-regression.yml','dic-cloud-regression']
 ]){
  const workflow=readFileSync(new URL('../.github/workflows/'+filename,import.meta.url),'utf8');
  assert.ok(workflow.includes("group: "+prefix+"-${{ github.ref }}-${{ github.event_name == 'push' && github.sha || 'pr' }}"),filename);
  assert.ok(workflow.includes("cancel-in-progress: ${{ github.event_name != 'push' }}"),filename);
  assert.equal(classifyImpactPaths(['.github/workflows/'+filename]).tier,'high');
 }
 const group=(kind,ref,sha)=>ref+'-'+(kind==='push'?sha:'pr');
 assert.notEqual(group('push','refs/heads/development/backend-foundation',A),group('push','refs/heads/development/backend-foundation',B));
 assert.equal(group('pull_request','refs/pull/123/merge',A),group('pull_request','refs/pull/123/merge',B));
});


test('Issue #267 disjoint semantic evidence JSON does not waste HIGH CI on docs-only pushes',()=>{
 const prefix='docs/audits/issue267-v2-strict-batches/';
 const safe=[
  'S2-DISJOINT-F221-477-506-20261122-V13CD.json',
  'S2-DISJOINT-CURRENT-C78-57-86-20261122-V13CD.json',
  'S2-DISJOINT-INDEX-V13CD-20261122.json',
  'S2-DISJOINT-F221-507-536-20261123-V13CE.json',
  'S2-DISJOINT-CURRENT-C78-87-116-20261123-V13CE.json',
  'S2-DISJOINT-INDEX-V13CE-20261123.json',
  'S2-DISJOINT-F221-657-673-F222-1-13-20261122-V13CJ.json',
  'S2-DISJOINT-CURRENT-C79-24-53-20261122-V13CJ.json',
  'S2-DISJOINT-INDEX-V13CJ-20261122.json'
 ].map(name=>prefix+name);
 const paths=[...safe,'docs/workstreams/issue-267.md','docs/workstreams/ops-issue267-v13cj-20261122.md'];
 for(const event of ['pull_request','push']){
  const proof=classifyChanges({base:A,head:B,event,git:()=>paths.join('\n')+'\n'});
  assert.equal(proof.tier,'docs',event);
  assert.equal(proof.reason,'NON_RUNTIME_ONLY',event);
  assert.equal(proof.node_mode,'none',event);
  assert.equal(proof.sql,false,event);
  assert.equal(proof.browser_mode,'none',event);
  assert.equal(proof.build_browser||proof.build_validate,false,event);
 }
 for(const invalid of [
  'S2-DISJOINT-INDEX-V13CD-20261122.json.bak',
  'S2-DISJOINT-INDEX-BAD-20261122.json',
  'S2-DISJOINT-INDEX-V13CD-20261122.js',
  'S2-DISJOINT-F221-477-506-20261122.json',
  'S2-DISJOINT-F221-657-673-F0-1-13-20261122-V13CJ.json',
  'S2-DISJOINT-F221-657-673-F222-1-13-F223-14-30-20261122-V13CJ.json',
  'S2-DISJOINT-F221-657-673-C79-24-53-20261122-V13CJ.json',
  'S2-DISJOINT-F221-657-673-F222-1-13-20261122-V13CJ.js',
  'S2-DISJOINT-F0-477-506-20261122-V13CD.json',
  'S2-DISJOINT-CURRENT-C78-57-86-20261122-V13CD.sql',
  'S2-DISJOINT-CURRENT-C78-57-86-20261122-V13CD.json.bak',
  'S2-DISJOINT-INDEX-V13CD-20261122/../app.js'
 ])assert.equal(classifyImpactPaths([prefix+invalid]).tier,'high',invalid);
 for(const changed of ['site/cloud/main.js','scripts/audit/ci-scope.mjs',
  '.github/workflows/approval-continuity.yml','supabase/migrations/new.sql']){
  const bare=classifyImpactPaths([changed]);
  const mixed=classifyImpactPaths([...paths,changed]);
  assert.equal(mixed.tier,bare.tier,changed);
  assert.equal(mixed.node_mode,bare.node_mode,changed);
  assert.equal(mixed.sql,bare.sql,changed);
 }
 const frozen=classifyChanges({base:A,head:B,event:'candidate',git:()=>paths.join('\n')+'\n'});
 assert.equal(frozen.tier,'high','no candidate PASS from documentation-only evidence');
 assert.equal(frozen.node_mode,'full');
});
