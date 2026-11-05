import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyImpactPaths,classifyChanges,deployableRiskPaths,selectImpactSource} from '../scripts/audit/ci-scope.mjs';
const A='a'.repeat(40),B='b'.repeat(40);
test('Markdown and governance queue evidence require no app tests',()=>{
 for(const paths of [['docs/CURRENT_STATUS.md'],['docs/RELEASE_QUEUE.json'],
  ['docs/MASTER_SPECIFICATION.md','docs/APPROVAL_COVERAGE_MATRIX.json']]){
  const v=classifyImpactPaths(paths);
  assert.equal(v.tier,'docs');assert.equal(v.node_mode,'none');
  assert.equal(v.sql,false);assert.equal(v.build_validate,false);assert.equal(v.build_browser,false);
 }
});
test('styles use one browser-owned build and focused visual but no full tests or SQL',()=>{
 const v=classifyImpactPaths(['site/visual.css']);
 assert.equal(v.tier,'low');assert.equal(v.browser_mode,'visual');
 assert.equal(v.build_browser,true);assert.equal(v.build_validate,false);
 assert.equal(v.sql,false);assert.equal(v.node_mode,'none');
});
test('grinder and coffee are scoped MEDIUM, cloud UI affects browser/offline',()=>{
 const shots=classifyImpactPaths(['site/lib/engine.js']);
 assert.equal(shots.tier,'medium');assert.equal(shots.node_mode,'shots');
 assert.equal(shots.browser_mode,'none');assert.equal(shots.sql,false);
 const coffee=classifyImpactPaths(['src/server/coffee-identity-evidence.mjs']);
 assert.equal(coffee.node_mode,'coffee');assert.equal(coffee.sql,false);
 const ux=classifyImpactPaths(['site/cloud/shot_card.js']);
 assert.equal(ux.cloud_mode,'targeted');assert.equal(ux.browser_mode,'ui');
 assert.equal(ux.build_browser,true);assert.equal(ux.build_validate,false);
});
test('SQL/Auth/CI/unknown/multi-domain/source traversal fail closed HIGH',()=>{
 for(const paths of [['supabase/migrations/new.sql'],['site/cloud/main.js'],
  ['netlify/functions/coffee-url-preview.mjs'],['scripts/audit/ci-scope.mjs'],
  ['site/unknown.tx'],['docs/../../site/main.css'],
  ['site/lib/engine.js','src/server/coffee-identity-evidence.mjs'],[]]){
  const v=classifyImpactPaths(paths);
  assert.equal(v.tier,'high',paths.join(','));assert.equal(v.node_mode,'full');
  assert.equal(v.sql,true);
 }
});
test('release candidate uses published baseline and deployable paths, not manifest commit',()=>{
 const selected=selectImpactSource({base:'0'.repeat(40),head:B,
  ref:'refs/heads/release-candidates/owner-ready-once',event:'push',
  queue:{published_base:{tested_source_sha:A}}});
 assert.deepEqual(selected,{base:A,head:B,event:'candidate'});
 assert.deepEqual(deployableRiskPaths(['docs/RELEASE_CANDIDATE.json','site/lib/engine.js',
  'tests/ci-scope.test.mjs','src/server/coffee-identity-evidence.mjs']),
 ['site/lib/engine.js','src/server/coffee-identity-evidence.mjs']);
 let args;
 const run=(n,a)=>{args=a;return 'docs/RELEASE_CANDIDATE.json\ntests/ci-scope.test.mjs\nsite/lib/engine.js';};
 const v=classifyChanges({...selected,git:run});
 assert.equal(args[3],A+'..'+B);assert.equal(v.node_mode,'shots');
 assert.equal(v.tier,'medium');assert.deepEqual(v.paths,['site/lib/engine.js']);
 assert.equal(classifyChanges({...selected,git:()=>''}).tier,'high');
 assert.equal(classifyChanges({...selected,git:()=>{throw Error('missing source');}}).tier,'high');
 assert.equal(classifyChanges({base:'0'.repeat(40),head:B}).tier,'high');
});


test('Strict Issue #267 audit-only JSON receipts avoid expensive app/SQL/browser CI',()=>{
 const files=[
  'docs/audits/issue267-review-restart-v2-20261101.json',
  'docs/audits/issue267-v2-strict-coverage-ledger-20261103.json',
  'docs/audits/issue267-v2-strict-batches/S2-001.json',
  'docs/audits/issue267-v2-strict-batches/S2-002.json',
  'docs/audits/issue267-v2-strict-batches/S2-1000.json',
  'docs/workstreams/issue-267.md'
 ];
 const v=classifyImpactPaths(files);
 assert.equal(v.tier,'docs');assert.equal(v.docs_only,true);
 assert.equal(v.node_mode,'none');assert.equal(v.cloud_mode,'none');
 assert.equal(v.browser_mode,'none');assert.equal(v.sql,false);
 assert.equal(v.lint,false);assert.equal(v.provider_guard,false);
 assert.equal(v.build_validate,false);assert.equal(v.build_browser,false);
 const run=(name,_args)=>{assert.equal(name,'git');return files.join('\n')+'\n';};
 const tested=classifyChanges({base:A,head:B,event:'pull_request',git:run});
 assert.equal(tested.tier,'docs');assert.equal(tested.node_mode,'none');
});
test('Strict #267 JSON path exemption never weakens unknown/mixed-source fail-closed HIGH',()=>{
 for(const paths of [
  ['docs/audits/issue267-executable-fixture.json'],
  ['docs/audits/issue267-v2-strict-batches/S2-002.json','scripts/audit/ci-scope.mjs'],
  ['docs/audits/issue267-v2-strict-batches/S2-002.json','supabase/migrations/new.sql'],
  ['docs/audits/issue267-v2-strict-batches/S2-002.json','docs/audits/issue267-v2-strict-batches/../unsafe.json'],
  ['docs/audits/issue267-v2-strict-batches/S2-002.json','docs/audits/unexpected.json']
 ]){
  const v=classifyImpactPaths(paths);
  assert.equal(v.tier,'high',paths.join(';'));
  assert.equal(v.node_mode,'full');assert.equal(v.sql,true);
 }
});

test('Issue #267 precise post-pin direct-review ledger is governance-only, without relaxing unknown source',()=>{
 const ledger='docs/audits/issue267-v2-post-pin-direct-coverage-ledger-20261105.json';
 const receipt='docs/audits/issue267-v2-post-pin-direct-batches/D2-005.json';
 const good=classifyImpactPaths([ledger,receipt,'docs/workstreams/issue-267.md']);
 assert.equal(good.tier,'docs');assert.equal(good.docs_only,true);
 assert.equal(good.node_mode,'none');assert.equal(good.cloud_mode,'none');
 assert.equal(good.browser_mode,'none');assert.equal(good.sql,false);
 assert.equal(good.provider_guard,false);assert.equal(good.lint,false);
 assert.equal(good.build_validate,false);assert.equal(good.build_browser,false);
 for(const invalid of [ledger+'.bak',
  'docs/audits/issue267-v2-post-pin-direct-coverage-ledger-20261106.json',
  'docs/audits/issue267-v2-post-pin-direct-coverage-ledger-20261105.json/../unsafe.json']){
  const risk=classifyImpactPaths([invalid]);
  assert.equal(risk.tier,'high',invalid);assert.equal(risk.node_mode,'full');
  assert.equal(risk.sql,true);
 }
 for(const runtime of ['scripts/audit/ci-scope.mjs','supabase/migrations/new.sql',
  '.github/workflows/cloud-regression.yml','site/lib/engine.js']){
  const risk=classifyImpactPaths([ledger,receipt,runtime]);
  assert.equal(risk.tier,classifyImpactPaths([runtime]).tier,runtime);
  assert.equal(risk.sql,classifyImpactPaths([runtime]).sql,runtime);
 }
});

test('Strict #504 word-audit receipts and ledger are docs-only without expensive app suites',()=>{
 const paths=['docs/audits/issue504-review-G1-020.json',
  'docs/audits/issue504-review-G1-1000.json',
  'docs/audits/issue504-coverage-ledger.json',
  'docs/workstreams/issue-504.md'];
 const v=classifyImpactPaths(paths);
 assert.equal(v.tier,'docs');assert.equal(v.docs_only,true);
 assert.equal(v.node_mode,'none');assert.equal(v.browser_mode,'none');
 assert.equal(v.sql,false);assert.equal(v.provider_guard,false);
 assert.equal(v.lint,false);assert.equal(v.build_validate,false);assert.equal(v.build_browser,false);
 const tested=classifyChanges({base:A,head:B,event:'pull_request',
  git:()=>paths.join('\n')+'\n'});
 assert.equal(tested.tier,'docs');assert.equal(tested.reason,'NON_RUNTIME_ONLY');
});
test('Strict #504 exemption fails closed on mixed source, malformed and unknown evidence paths',()=>{
 for(const path of ['docs/audits/issue504-review-G1-020.json.bak',
  'docs/audits/issue504-review-G1-all.json',
  'docs/audits/issue504-changes.json',
  'docs/audits/issue504-review-G1-020/../unsafe.json',
  'docs/audits/issue504-coverage-ledger.json/../unsafe.json',
  'docs/audits/issue504-review-G1-020.json',
 ]){
  if(path==='docs/audits/issue504-review-G1-020.json'){
   for(const code of ['scripts/audit/ci-scope.mjs','site/lib/engine.js',
    'supabase/migrations/new.sql','.github/workflows/cloud-regression.yml']){
    const v=classifyImpactPaths([path,code]);
    // Audit JSON must not lower the normal risk of the actual changed source.
    const pure=classifyImpactPaths([code]);
    assert.equal(v.tier,pure.tier,code);
    assert.equal(v.sql,pure.sql,code);
    assert.equal(v.node_mode,pure.node_mode,code);
   }
  }else{
   const v=classifyImpactPaths([path]);
   assert.equal(v.tier,'high',path);assert.equal(v.node_mode,'full');
  }
 }
});

test('Issue #267 dated immutable Git-tree inventories stay governance-only, unknown inputs still fail closed',()=>{
  const good=[
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105-973c59.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261106-abcdef1234.json',
    'docs/audits/issue267-v2-strict-coverage-ledger-20261103.json',
    'docs/workstreams/issue-267.md'
  ];
  const safe=classifyImpactPaths(good);
  assert.equal(safe.tier,'docs');assert.equal(safe.docs_only,true);
  assert.equal(safe.node_mode,'none');assert.equal(safe.cloud_mode,'none');
  assert.equal(safe.browser_mode,'none');assert.equal(safe.sql,false);
  assert.equal(safe.build_validate,false);assert.equal(safe.build_browser,false);
  const classified=classifyChanges({base:A,head:B,event:'pull_request',
    git:()=>good.join('\n')+'\n'});
  assert.equal(classified.tier,'docs');
  for(const wrong of [
    'docs/audits/issue267-v2-post-pin-tree-drift-20261106.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105-abcde.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105-gggggg.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105-973c59.json.bak',
    'docs/audits/issue267-v2-post-pin-tree-drift-20261105-973c59/../secret.json',
    'docs/audits/issue267-v2-post-pin-tree-drift-executable.json',
    'docs/audits/unsafe-new-policy.json'
  ]){
    const result=classifyImpactPaths([wrong]);
    assert.equal(result.tier,'high',wrong);assert.equal(result.sql,true,wrong);
  }
  for(const runtime of ['scripts/audit/ci-scope.mjs','.github/workflows/cloud-beta-ci.yml',
    'supabase/migrations/new.sql','site/lib/engine.js']){
    const result=classifyImpactPaths([...good,runtime]);
    assert.equal(result.tier,classifyImpactPaths([runtime]).tier,runtime);
    assert.equal(result.sql,classifyImpactPaths([runtime]).sql,runtime);
  }
});

test('Issue #267 disjoint D2 pending indexes are docs-only, without exempting code or arbitrary JSON',()=>{
  const ok='docs/audits/issue267-v2-post-pin-direct-pending/D2-042-043-20261105-hour12.json';
  const evidence='docs/audits/issue267-v2-post-pin-direct-batches/D2-042.json';
  const journal='docs/workstreams/issue267-d2-042-043-20261105.md';
  const v=classifyImpactPaths([ok,evidence,journal]);
  assert.equal(v.tier,'docs');assert.equal(v.docs_only,true);
  assert.equal(v.node_mode,'none');assert.equal(v.browser_mode,'none');
  assert.equal(v.sql,false);assert.equal(v.build_browser,false);
  for(const bad of [
    'docs/audits/issue267-v2-post-pin-direct-pending/D2-042-043-20261105-hour99.json',
    'docs/audits/issue267-v2-post-pin-direct-pending/D2-042-043-20261105-hour12.json.bak',
    'docs/audits/issue267-v2-post-pin-direct-pending/D2-042-043-20261105-hour12/../bad.json',
    'docs/audits/issue267-v2-post-pin-direct-pending/D2-042-extra-20261105-hour12.json',
    'docs/audits/issue267-v2-post-pin-direct-pending/D2-42-043-20261105-hour12.json',
    'docs/audits/issue267-v2-post-pin-direct-pending/unreviewed.json'
  ]){
    const high=classifyImpactPaths([bad]);
    assert.equal(high.tier,'high',bad);assert.equal(high.sql,true,bad);
  }
  for(const runtime of ['scripts/audit/ci-scope.mjs','supabase/migrations/new.sql',
    '.github/workflows/cloud-beta-ci.yml','tests/ci-impact.test.mjs']){
    const high=classifyImpactPaths([ok,evidence,runtime]);
    assert.equal(high.tier,'high',runtime);assert.equal(high.node_mode,'full',runtime);
  }
});
