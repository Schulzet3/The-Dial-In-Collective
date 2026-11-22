import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,mkdirSync,writeFileSync} from 'node:fs';
import {planFullSuite,selectFullSuiteShard,FULL_SUITE_CONCURRENCY} from '../scripts/audit/run-full-suite.mjs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parseStageArgs,runMeasuredStage} from '../scripts/audit/measure-stage.mjs';
import {browserQAPlan,browserQALanes,runBrowserQA} from '../scripts/audit/run-browser-qa.mjs';
import {EventEmitter} from 'node:events';
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');


test('one build per scoped change and no routine duplicate browser/full suites',()=>{
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const cloud=file('.github/workflows/cloud-regression.yml');
 const sql=file('.github/workflows/isolated-sql-regression.yml');
 const visual=file('.github/workflows/visual-review.yml');
 const approval=file('.github/workflows/approval-continuity.yml');
 assert.match(beta,/Run all checked-in Node tests \(HIGH risk only\)[\s\S]*?run-full-suite\.mjs --shard=0\/3/);
 assert.match(cloud,/cloud-tests:[\s\S]*?run-full-suite\.mjs --shard=1\/3/);
 assert.match(approval,/approval:[\s\S]*?run-full-suite\.mjs --shard=2\/3/);
 assert.match(beta,/node --test tests\/grind-/);
 assert.match(beta,/node --test tests\/coffee-/);
 assert.match(cloud,/cloud-tests:[\s\S]*?node --test tests\/cloud/);
 assert.match(cloud,/mobile-browser-qa:[\s\S]*?node scripts\/audit\/run-browser-qa\.mjs/);
 assert.match(file('scripts/audit/run-browser-qa.mjs'),/tests\/browser\/cloud_owner_qa\.py/);
 assert.match(file('scripts/audit/run-browser-qa.mjs'),/tests\/browser\/visual_review\.py/);
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
 const shards=['0/3','1/3','2/3'].map(s=>selectFullSuiteShard(plan,s));
 assert.deepEqual(shards.flatMap(s=>s.parallel).sort(),plan.parallel,'all full-suite files run once across required existing jobs');
 const shiftedOwner=i=>{
  if(i%3!==2)return i%3;
  const slot=Math.floor(i/3)%4;
  return slot===0?0:slot===1?1:2;
 };
 for(let lane=0;lane<3;lane++){
  assert.deepEqual(shards[lane].parallel,plan.parallel.filter((_,i)=>shiftedOwner(i)===lane));
  assert.deepEqual(shards[lane].serial,lane===2?plan.serial:[]);
 }
 const counts=shards.map(s=>s.parallel.length);
 assert.ok(counts[0]>=counts[2]*2&&counts[1]>=counts[2]*2,
  'measured slow approval lane gets roughly half as many general files');
 assert.ok(Math.abs(counts[0]-counts[1])<=1,'other existing runners receive balanced overflow');
 for(let i=0;i<plan.parallel.length;i++)assert.equal([0,1,2].filter(lane=>shiftedOwner(i)===lane).length,1,
  'single exact owner for full-suite file '+i);
 const legacy0=selectFullSuiteShard(plan,'0/2'),legacy1=selectFullSuiteShard(plan,'1/2');
 assert.deepEqual([...legacy0.parallel,...legacy1.parallel].sort(),plan.parallel,
  'legacy 2-way source still has exhaustive coverage');
 assert.deepEqual(legacy1.serial,plan.serial);
 assert.match(file('scripts/audit/run-full-suite.mjs'),/if\(!files\.length\)/,
  'Empty serial shard must NOT invoke Node auto-discovery');
 assert.equal(new Set(shards.flatMap(x=>x.parallel)).size,plan.parallel.length);
 assert.throws(()=>selectFullSuiteShard(plan,'3/3'),/Invalid full-suite shard/);
 assert.throws(()=>selectFullSuiteShard(plan,'1/4'),/Invalid full-suite shard/);
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

test('QA-only lane runs four scoped tests on Node 22 without dependency install or browser',()=>{
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const node=beta.indexOf("node-version: '22'");
 const qa=beta.indexOf("name: Run focused CI-only regression tests");
 const install=beta.indexOf("name: Install locked dependencies for affected Node/build tasks");
 assert.ok(node>=0&&qa>node&&install>qa);
 assert.match(beta,/if: steps\.scope\.outputs\.node_mode == 'qa'/);
 assert.match(beta,/run: node --test tests\/ci-optimization\.test\.mjs tests\/ci-scope\.test\.mjs tests\/fast-pr-check\.test\.mjs tests\/site-integrity\.test\.mjs/);
 assert.match(beta,/steps\.scope\.outputs\.node_mode != 'qa'/);
 assert.match(file('scripts/audit/ci-scope.mjs'),/const QA_ONLY_PATHS=new Set/);
});

test('parallel browser wrapper retains every prior acceptance script at each risk level',()=>{
 const built='tests/browser/built_app_qa.py';
 assert.deepEqual(browserQAPlan('visual'),[built]);
 assert.deepEqual(browserQAPlan('ui'),[built,'tests/browser/cloud_owner_qa.py','tests/browser/pwa_offline_qa.py']);
 assert.deepEqual(browserQAPlan('high'),[
  built,'tests/browser/cloud_owner_qa.py','tests/browser/admin_invitation_qa.py',
  'tests/browser/pwa_offline_qa.py','tests/browser/issue26_accessibility_qa.py',
  'tests/browser/admin_records_qa.py'
 ]);
 assert.throws(()=>browserQAPlan('none'),/Unexpected browser QA mode/);
 const runner=file('scripts/audit/run-browser-qa.mjs');
 assert.match(runner,/Promise\.all/,'visual assertions and other tests must execute concurrently');
 assert.match(runner,/status!==0/,'any failed child process must fail CI');
 assert.match(file('tests/browser/visual_review.py'),/DIC_CAPTURE_VISUAL/);
 assert.match(file('.github/workflows/cloud-regression.yml'),/DIC_CAPTURE_VISUAL:/);
});

test('bounded browser lanes are disjoint, exhaustive and preserve serial fixture order',()=>{
 for(const mode of ['visual','ui','high']){
  const lanes=browserQALanes(mode);
  assert.ok(lanes.length<=2&&lanes.every(l=>l.length>0));
  assert.deepEqual(lanes.flat().sort(),browserQAPlan(mode).sort());
  assert.equal(new Set(lanes.flat()).size,browserQAPlan(mode).length);
 }
 assert.deepEqual(browserQALanes('high')[1],[
  'tests/browser/pwa_offline_qa.py',
  'tests/browser/issue26_accessibility_qa.py',
  'tests/browser/admin_records_qa.py'
 ]);
});
test('parallel browser orchestration runs all suites and rejects any failed fixture',async()=>{
 const seen=[];let active=0,maxActive=0;
 const runner=(_python,args)=>{
  const child=new EventEmitter();
  seen.push(args[0]);active++;maxActive=Math.max(maxActive,active);
  queueMicrotask(()=>{
   active--;
   child.emit('close',args[0]==='tests/browser/pwa_offline_qa.py'?2:0,null);
  });
  return child;
 };
 await assert.rejects(runBrowserQA('high',{python:'mock',runner}),/Browser acceptance failed/);
 assert.deepEqual(seen.sort(),['tests/browser/visual_review.py',...browserQAPlan('high')].sort());
 assert.equal(maxActive,3,'visual plus two lanes only; no unbounded Chromium fanout');
});

test('HIGH-risk lint runs on faster cloud-tests lane exactly once; medium-risk lint remains validate',()=>{
 const beta=file('.github/workflows/cloud-beta-ci.yml');
 const cloud=file('.github/workflows/cloud-regression.yml');
 assert.match(beta,/name: Lint affected JS or workflow source \(non-HIGH only\)\n        if: steps\.scope\.outputs\.lint == 'true' && steps\.scope\.outputs\.node_mode != 'full'/);
 assert.match(cloud,/name: Lint HIGH-risk source on cloud-tests runner \(one lint total\)\n        if: steps\.scope\.outputs\.node_mode == 'full' && steps\.scope\.outputs\.lint == 'true'/);
 assert.equal((beta.match(/npm run lint/g)||[]).length,1);
 assert.equal((cloud.match(/npm run lint/g)||[]).length,1);
 assert.ok(cloud.indexOf('name: Lint HIGH-risk source on cloud-tests')<cloud.indexOf('  mobile-browser-qa:'),'lint must remain in cloud-tests job');
 assert.ok(cloud.indexOf('name: Run second third of high-risk full Node corpus')<cloud.indexOf('name: Lint HIGH-risk source'),'finish protected security test before lint');
});


test('pinned Chromium cache preserves dependency installation and all browser acceptances',()=>{
 const cloud=file('.github/workflows/cloud-regression.yml');
 const browser=cloud.split('  mobile-browser-qa:')[1];
 assert.ok(browser,'browser job must exist');
 const cache=browser.indexOf('name: Reuse pinned Chromium headless-shell download');
 const install=browser.indexOf('name: Install one isolated Chromium browser');
 const accept=browser.indexOf('name: Run all browser acceptances with parallel visual assertions');
 assert.ok(cache>=0&&install>cache&&accept>install,'cache must not replace installation or acceptance');
 assert.ok(browser.includes('uses: actions/cache@v4'));
 assert.ok(browser.includes('path: ~/.cache/ms-playwright'));
 assert.ok(browser.includes('key: dic-pw-shell-v1.55.0-py312-${{ runner.os }}-${{ runner.arch }}'));
 assert.ok(browser.includes("name: Reuse pinned Chromium headless-shell download\\n        if: steps.scope.outputs.browser_mode != 'none'".replace('\\n','\n')));
 assert.ok(browser.includes('python -m pip install playwright==1.55.0'));
 assert.equal(browser.split('python -m playwright install --with-deps --only-shell chromium').length-1,2);
 assert.ok(browser.includes("if ! grep -q 'azure.archive.ubuntu.com'"));
 assert.ok(browser.includes('run: node scripts/audit/run-browser-qa.mjs'));
});

test('SQL release regression retains immutable source push CI and superseded-PR coalescing',()=>{
 const sql=file('.github/workflows/isolated-sql-regression.yml');
 const suffix="${{ github.event_name == 'push' && github.sha || 'pr' }}";
 assert.ok(sql.includes('group: dic-isolated-sql-regression-${{ github.ref }}-'+suffix));
 assert.ok(sql.includes("cancel-in-progress: ${{ github.event_name != 'push' }}"));
 for(const workflow of ['.github/workflows/cloud-beta-ci.yml','.github/workflows/cloud-regression.yml','.github/workflows/approval-continuity.yml']){
  const current=file(workflow);
  assert.ok(current.includes(suffix),'exact-source push check must not be canceled: '+workflow);
  assert.ok(current.includes("cancel-in-progress: ${{ github.event_name != 'push' }}"));
 }
 assert.match(sql,/if: steps\.scope\.outputs\.sql == 'true'[\s\S]*?isolated-sql-regression\.sh/);
 assert.match(sql,/if: steps\.scope\.outputs\.sql == 'true'[\s\S]*?isolated-signed-http-regression\.sh/);
 assert.match(sql,/if: steps\.scope\.outputs\.sql == 'true'[\s\S]*?isolated-backup-snapshot-regression\.sh/);
});


test('Chromium setup skips apt only after an actual pinned headless-shell DOM smoke',()=>{
 const browser=file('.github/workflows/cloud-regression.yml').split('  mobile-browser-qa:')[1];
 const install=browser.split('name: Install one isolated Chromium browser for all relevant acceptance')[1]
  .split('name: Run all browser acceptances with parallel visual assertions')[0];
 assert.match(install,/python -m playwright install --only-shell chromium/);
 assert.match(install,/chromium_smoke\(\) \{/);
 assert.match(install,/pw\.chromium\.launch\(headless=True\)/);
 assert.match(install,/page\.locator\("#dic-ready"\)\.inner_text\(\) == "ready"/);
 assert.match(install,/if chromium_smoke; then[\s\S]*?else[\s\S]*?if ! python -m playwright install --with-deps --only-shell chromium; then/);
 assert.match(install,/azure\.archive\.ubuntu\.com/);
 assert.match(install,/sudo apt-get update -o Acquire::Retries=2/);
 assert.match(install,/python -m playwright install --with-deps --only-shell chromium[\s\S]*?fi\n            chromium_smoke\n          fi/);
 assert.match(browser,/name: Run all browser acceptances with parallel visual assertions[\s\S]*?node scripts\/audit\/run-browser-qa\.mjs/);
});
