import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parseStageArgs,runMeasuredStage} from '../scripts/audit/measure-stage.mjs';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('fast feedback never replaces the full release suite or required five named checks',()=>{
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const cloud=file('.github/workflows/cloud-regression.yml');
 const sql=file('.github/workflows/isolated-sql-regression.yml');
 const approval=file('.github/workflows/approval-continuity.yml');
 const pkg=JSON.parse(file('package.json'));
 assert.match(beta,/Run all checked-in Node tests[\s\S]*?npm test/);
 const publish=file('netlify.toml');
 assert.match(publish,/command\s*=\s*"npm run build:cloud"/);
 assert.doesNotMatch(publish,/command\s*=\s*"npm test &&/);
 // Application build still checks the owner approval and packaged graph.
 const build=file('build_cloud.mjs');
 assert.match(build,/checkRepository\(\)/);
 assert.match(build,/validateDist\(root\)/);
 assert.match(beta,/node --test tests\/netlify-credit-guard\.test\.mjs tests\/one-use-claim\.test\.mjs/);
 assert.match(cloud,/cloud-tests:[\s\S]*?npm run test:cloud/);
 assert.match(cloud,/mobile-browser-qa:[\s\S]*?python tests\/browser\/cloud_owner_qa\.py/);
 assert.match(sql,/isolated-sql-regression\.sh/);
 assert.match(approval,/scripts\/audit\/approval-coverage\.mjs/);
 assert.match(pkg.scripts.test,/tests\/\*\.test\.mjs/);
 assert.match(pkg.scripts['test:cloud'],/tests\/coffee-\*\.test\.mjs/);
 assert.match(pkg.scripts['test:cloud'],/tests\/admin-\*\.test\.mjs/);
 const visual=file('.github/workflows/visual-review.yml');
 assert.match(visual,/python tests\/browser\/visual_review\.py/);
 assert.match(visual,/node scripts\/audit\/site-integrity\.mjs --dist/);
 assert.doesNotMatch(visual,/^- run: npm test$/m);
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
