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
