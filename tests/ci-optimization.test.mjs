import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {planFullSuite,selectFullSuiteShard,FULL_SUITE_CONCURRENCY} from '../scripts/audit/run-full-suite.mjs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parseStageArgs,runMeasuredStage} from '../scripts/audit/measure-stage.mjs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');


test('one build per scoped change and no routine duplicate browser/full suites',()=>{
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const cloud=file('.github/workflows/cloud-regression.yml');
 const sql=file('.github/workflows/isolated-sql-regression.yml');
 const visual=file('.github/workflows/visual-review.yml');
 const approval=file('.github/workflows/approval-continuity.yml');
 assert.match(beta,/Run all checked-in Node tests \(HIGH risk only\)[\s\S]*?run-full-suite\.mjs --shard=0\/2/);
 assert.match(cloud,/cloud-tests:[\s\S]*?run-full-suite\.mjs --shard=1\/2/);
 assert.match(beta,/node --test tests\/grind-/);
 assert.match(beta,/node --test tests\/coffee-/);
 assert.match(cloud,/cloud-tests:[\s\S]*?node --test tests\/cloud/);
 assert.match(cloud,/mobile-browser-qa:[\s\S]*?python tests\/browser\/cloud_owner_qa\.py/);
 assert.match(cloud,/python tests\/browser\/visual_review\.py/);
 assert.match(sql,/if: steps\.scope\.outputs\.sql == 'true'[\s\S]*?isolated-sql-regression\.sh/);
 assert.match(approval,/scripts\/audit\/approval-coverage\.mjs/);
 assert.match(file('netlify.toml'),/command\s*=\s*"npm run build:cloud"/);
 assert.match(file('build_cloud.mjs'),/checkRepository\(\)/);
 assert.match(file('build_cloud.mjs'),/validateDist\(root\)/);
 assert.match(beta,/node --test tests\/netlify-credit-guard\.test\.mjs tests\/one-use-claim\.test\.mjs/);
 assert.match(visual,/on:\s*\n  workflow_dispatch:/);
 assert.doesNotMatch(visual,/pull_request:/);
 assert.doesNotMatch(cloud,/npm run test:cloud/);
 assert.doesNotMatch(sql,/npm run build:cloud/);
 assert.equal((cloud.match(/npm run build:cloud/g)||[]).length,1);
 assert.equal((beta.match(/npm run build:cloud/g)||[]).length,1);
 assert.match(visual,/node scripts\/audit\/site-integrity\.mjs --dist/);
});
test('CI stage receipts cannot escape artifact dir or inject shell',()=>{
 assert.deepEqual(parseStageArgs(['--name','lint','--out','qa_artifacts/ci-metrics/validate.jsonl','--','npm','run','lint']),{
  name:'lint',out:'qa_artifacts/ci-metrics/validate.jsonl',command:['npm','run','lint']});
 assert.throws(()=>parseStageArgs(['--name','lint','--out','../../secrets','--','npm','test']),/Timing output/);
 assert.throws(()=>parseStageArgs(['--name','a;curl','--out','qa_artifacts/ci-metrics/a.jsonl','--','npm']),/Invalid stage/);
});
test('CI timing appends success and failure receipts without arguments or environment',()=>{
 const dir=mkdtempSync(join(tmpdir(),'dic-ci-'));const out=join(dir,'stages.jsonl');
 try{
  const pass=runMeasuredStage({name:'fixture-pass',out,command:[process.execPath,'-e','process.exit(0)']});
  const fail=runMeasuredStage({name:'fixture-fail',out,command:[process.execPath,'-e','process.exit(7)']});
  const rows=readFileSync(out,'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(pass.exit_code,0);assert.equal(fail.exit_code,7);
  assert.deepEqual(rows.map(x=>x.outcome),['PASS','FAIL']);
  assert.ok(rows.every(x=>Number.isFinite(x.duration_ms)&&x.duration_ms>=0));
  assert.ok(rows.every(x=>!JSON.stringify(x).includes('process.exit')));
  assert.ok(rows.every(x=>!Object.hasOwn(x,'env')&&!Object.hasOwn(x,'command')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// #3667: run every full-suite test file exactly once, isolate the 4s attack budget.
test('full Node suite preserves the security corpus while parallelizing other files',()=>{
 const pkg=JSON.parse(file('package.json'));
 assert.equal(pkg.scripts.test,'node scripts/audit/run-full-suite.mjs');
 assert.equal(FULL_SUITE_CONCURRENCY,4);
 const plan=planFullSuite();
 assert.deepEqual(plan.serial,['tests/html-resource-security.test.mjs']);
 assert.ok(plan.parallel.length>100);
 assert.ok(plan.parallel.includes('tests/ci-optimization.test.mjs'));
 assert.ok(plan.parallel.some(path=>path.startsWith('tests/audit/')));
 assert.equal(new Set([...plan.parallel,...plan.serial]).size,plan.parallel.length+plan.serial.length);
 const shard0=selectFullSuiteShard(plan,'0/2'),shard1=selectFullSuiteShard(plan,'1/2');
 assert.deepEqual([...shard0.parallel,...shard1.parallel].sort(),plan.parallel);
 assert.deepEqual(shard0.serial,plan.serial);
 assert.deepEqual(shard1.serial,[]);
 assert.equal(new Set([...shard0.parallel,...shard1.parallel]).size,plan.parallel.length);
 assert.throws(()=>selectFullSuiteShard(plan,'0/3'),/Invalid full-suite shard/);
 assert.throws(()=>selectFullSuiteShard(plan,'2/2'),/Invalid full-suite shard/);
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const cloud=file('.github/workflows/cloud-regression.yml');
 const paths=src=>[...src.split('  push:\n')[1].split('  pull_request:')[0].matchAll(/^      - '([^']+)'$/gm)].map(m=>m[1]);
 for(const path of paths(beta))assert.ok(paths(cloud).includes(path),'cloud-tests push trigger missing '+path);
 const prIgnore=src=>src.split('    paths-ignore:\n')[1].split('  workflow_dispatch:')[0].trim();
 assert.equal(prIgnore(beta),prIgnore(cloud),'every full-suite PR must trigger both required jobs');
 assert.match(file('tests/html-resource-security.test.mjs'),/timeout:4000/);
});
test('full Node suite fails closed if the isolated resource-security test disappears',()=>{
 const root=mkdtempSync(join(tmpdir(),'dic-suite-plan-'));
 try{
  mkdirSync(join(root,'tests','audit'),{recursive:true});
  writeFileSync(join(root,'tests','toy.test.mjs'),'// safe toy');
  writeFileSync(join(root,'tests','audit','audit.test.mjs'),'// safe audit');
  assert.throws(()=>planFullSuite(root),/resource-security/);
  writeFileSync(join(root,'tests','html-resource-security.test.mjs'),'// protected');
  assert.deepEqual(planFullSuite(root),{
   parallel:['tests/audit/audit.test.mjs','tests/toy.test.mjs'],
   serial:['tests/html-resource-security.test.mjs']
  });
 }finally{rmSync(root,{recursive:true,force:true});}
});
