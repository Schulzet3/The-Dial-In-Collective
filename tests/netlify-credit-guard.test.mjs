import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';

const ledger=JSON.parse(readFileSync(new URL('../docs/NETLIFY_CREDIT_LEDGER.json',import.meta.url),'utf8'));
const baseline={context:'production',branch:'development/backend-foundation',
 subject:'Release DIC: bundled tested fixes [dic-publish]',today:'2026-10-14',ledger};
function withUsage(used,date='2026-10-14',remaining=Math.max(0,300-used)){
 const copy=structuredClone(ledger);
 copy.snapshots[copy.snapshots.length-1]={...copy.snapshots.at(-1),
  observed_total_used_credits:used,observed_remaining_credits:remaining,observed_date:date};
 return copy;
}
test('authoritative screenshot records 22 deploys and zero remaining',()=>{
 assert.equal(ledger.account_plan,'Free');
 assert.equal(ledger.monthly_included_credits,300);
 assert.equal(ledger.snapshots.at(-1).production_deploy_count,22);
 assert.equal(ledger.snapshots.at(-1).observed_total_used_credits,330.2);
 assert.equal(ledger.snapshots.at(-1).observed_remaining_credits,0);
});
test('current exhausted balance skips a marked production release',()=>{
 const r=decide(baseline);assert.equal(r.ignore,true);assert.match(r.reason,/Insufficient/);
});
test('untagged commits never publish even with plentiful fresh credits',()=>{
 const r=decide({...baseline,ledger:withUsage(0),subject:'Update recipe layout'});
 assert.equal(r.ignore,true);assert.match(r.reason,/marker/);
});
test('an intentionally tagged release proceeds with fresh verified credits',()=>{
 const r=decide({...baseline,ledger:withUsage(10)});
 assert.equal(r.ignore,false);
});
test('release with only 14.9 credits remaining must not publish',()=>{
 assert.equal(decide({...baseline,ledger:withUsage(285.1)}).ignore,true);
});
test('a stale usage screenshot blocks release even when credits seem sufficient',()=>{
 assert.equal(decide({...baseline,ledger:withUsage(0,'2026-10-01')}).ignore,true);
});
test('unknown and missing billing evidence fail closed',()=>{
 assert.equal(decide({...baseline,ledger:null}).ignore,true);
 assert.equal(decide({...baseline,ledger:{}}).ignore,true);
 assert.equal(decide({...baseline,ledger:withUsage(100,'bad-date')}).ignore,true);
 assert.equal(decide({...baseline,ledger:withUsage(0,'2026-10-16')}).ignore,true);
});
test('tampered or inconsistent credit totals fail closed',()=>{
 assert.equal(decide({...baseline,ledger:withUsage(100,'2026-10-14',300)}).ignore,true);
});
test('a production build on any other branch is ignored',()=>{
 assert.equal(decide({...baseline,branch:'main',ledger:withUsage(0)}).ignore,true);
});
test('free preview builds remain available without a production budget',()=>{
 for(const context of ['deploy-preview','branch-deploy']){
  assert.equal(decide({...baseline,context}).ignore,false);
 }
});
test('unknown contexts are not treated as safe production release',()=>{
 assert.equal(decide({...baseline,context:''}).ignore,true);
});
test('Netlify TOML activates pre-build production credit guard',()=>{
 const toml=readFileSync(new URL('../netlify.toml',import.meta.url),'utf8');
 assert.match(toml,/ignore\s*=\s*"node \.\/scripts\/netlify\/should-ignore-build\.mjs"/);
 assert.match(toml,/command\s*=\s*"npm test && npm run build:cloud"/);
});
