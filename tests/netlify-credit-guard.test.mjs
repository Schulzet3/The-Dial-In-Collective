import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decide} from '../scripts/netlify/should-ignore-build.mjs';

const ledger=JSON.parse(readFileSync(new URL('../docs/NETLIFY_CREDIT_LEDGER.json',import.meta.url),'utf8'));
const simulatedFreshLedger=structuredClone(ledger);
simulatedFreshLedger.release_policy.post_release_billing_refresh_needed=false;
simulatedFreshLedger.release_policy.credit_monitoring_mode='verified_snapshot';
// Freeze the unit-test billing example; operational snapshots may advance.
simulatedFreshLedger.snapshots=[ledger.snapshots.find(snapshot=>snapshot.observed_date==='2026-10-15')];
const baseline={context:'production',branch:'development/backend-foundation',
 subject:'Release DIC: bundled tested fixes [dic-publish]',today:'2026-10-15',ledger:simulatedFreshLedger};

function withUsage(used,date='2026-10-15',remaining=Math.max(0,ledger.monthly_included_credits-used)){
 const copy=structuredClone(ledger);
 copy.release_policy.post_release_billing_refresh_needed=false;
 copy.release_policy.credit_monitoring_mode='verified_snapshot';
 copy.snapshots[copy.snapshots.length-1]={...copy.snapshots.at(-1),
  observed_total_used_credits:used,observed_remaining_credits:remaining,observed_date:date};
 return copy;
}

test('preserve the 2026-10-14 exhausted Free screenshot as historical evidence',()=>{
 const old=ledger.snapshots.find(snapshot=>snapshot.observed_date==='2026-10-14');
 assert.ok(old);
 assert.equal(old.production_deploy_count,22);
 assert.equal(old.observed_total_used_credits,330.2);
 assert.equal(old.observed_remaining_credits,0);
});

test('owner-confirmed Personal plan gives 1000 deployable credits until Nov 14',()=>{
 const snapshot=ledger.snapshots.find(snapshot=>snapshot.observed_date==='2026-10-15');
 assert.equal(ledger.monthly_included_credits,1000);
 assert.match(ledger.account_plan,/Personal/);
 assert.equal(snapshot.active_plan,'Personal');
 assert.equal(snapshot.observed_date,'2026-10-15');
 assert.equal(snapshot.observed_remaining_credits,1000);
 assert.equal(snapshot.observed_total_used_credits,0);
 assert.equal(snapshot.plan_credits_expires,'2026-11-14');
 assert.equal(snapshot.operational_credits_remaining,29.6);
 assert.equal(snapshot.operational_credits_not_usable_for_production_deploy,true);
 assert.equal(snapshot.auto_recharge_enabled,false);
 assert.equal(ledger.scheduled_plan_change.plan,'Free');
});

test('a completed production release requires new observed credits before another release',()=>{
 const postReleaseLedger=structuredClone(simulatedFreshLedger);
 postReleaseLedger.release_policy.post_release_billing_refresh_needed=true;
 const r=decide({...baseline,ledger:postReleaseLedger});
 assert.equal(r.ignore,true);
 assert.match(r.reason,/refresh/);
});

test('current verified plan credits permit only a marked release',()=>{
 const r=decide(baseline);
 assert.equal(r.ignore,false);
});

test('zero deployable credits blocks production even if operational credits remain',()=>{
 const r=decide({...baseline,ledger:withUsage(1000)});
 assert.equal(r.ignore,true);
 assert.match(r.reason,/Insufficient/);
});

test('untagged commits never publish even with plentiful fresh credits',()=>{
 const r=decide({...baseline,ledger:withUsage(0),subject:'Update recipe layout'});
 assert.equal(r.ignore,true);
 assert.match(r.reason,/marker/);
});

test('an intentionally tagged release proceeds with fresh verified credits',()=>{
 const r=decide({...baseline,ledger:withUsage(10)});
 assert.equal(r.ignore,false);
});

test('release with only 14.9 deployable credits remaining must not publish',()=>{
 const r=decide({...baseline,ledger:withUsage(985.1)});
 assert.equal(r.ignore,true);
 assert.match(r.reason,/Insufficient/);
});

test('a stale usage screenshot blocks release even when credits seem sufficient',()=>{
 assert.equal(decide({...baseline,ledger:withUsage(0,'2026-10-01')}).ignore,true);
});

test('the scheduled Free downgrade requires a fresh snapshot before further releases',()=>{
 const r=decide({...baseline,today:'2026-11-15'});
 assert.equal(r.ignore,true);
 assert.match(r.reason,/stale/);
});

test('unknown and missing billing evidence fail closed',()=>{
 assert.equal(decide({...baseline,ledger:null}).ignore,true);
 assert.equal(decide({...baseline,ledger:{}}).ignore,true);
 assert.equal(decide({...baseline,ledger:withUsage(100,'bad-date')}).ignore,true);
 assert.equal(decide({...baseline,ledger:withUsage(0,'2026-10-16')}).ignore,true);
});

test('tampered or inconsistent credit totals fail closed',()=>{
 assert.equal(decide({...baseline,ledger:withUsage(100,'2026-10-15',300)}).ignore,true);
});

test('a production build on any other branch is ignored',()=>{
 assert.equal(decide({...baseline,branch:'main',ledger:withUsage(0)}).ignore,true);
});

test('the owner release hold forbids automatic preview and branch publication',()=>{
 for(const context of ['deploy-preview','branch-deploy']){
  const result=decide({...baseline,context});
  assert.equal(result.ignore,true);
  assert.match(result.reason,/release hold|unapproved/i);
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

test('owner October 17 credit screenshot is recorded without rewriting previous evidence',()=>{
 const last=ledger.snapshots.at(-1);
 assert.equal(last.observed_date,'2026-10-17');
 assert.equal(last.observed_remaining_credits,940);
 assert.equal(last.observed_total_used_credits,60);
 assert.equal(last.operational_credits_remaining,28.8);
 assert.equal(last.operational_credits_not_usable_for_production_deploy,true);
 assert.equal(last.plan_credits_expires,'2026-11-14');
 assert.equal(last.auto_recharge_enabled,false);
});

test('owner-managed credits no longer require a new screenshot every seven days',()=>{
 const owner=structuredClone(ledger);
 owner.release_policy.post_release_billing_refresh_needed=true;
 const result=decide({...baseline,ledger:owner,today:'2026-10-31'});
 assert.equal(result.ignore,false);
 assert.match(result.reason,/owner-managed/i);
});

test('owner management never permits an unmarked or nonproduction publish',()=>{
 for(const subject of ['docs: progress update','Release DIC: premature [not-publish]']){
  const r=decide({...baseline,ledger,today:'2026-10-31',subject});
  assert.equal(r.ignore,true);
  assert.match(r.reason,/marker/);
 }
 const other=decide({...baseline,ledger,today:'2026-10-31',branch:'main'});
 assert.equal(other.ignore,true);
});

test('owner-managed credit allowance still refuses known low funds and grant expiration',()=>{
 const low=structuredClone(ledger);
 low.snapshots[low.snapshots.length-1].observed_total_used_credits=990;
 low.snapshots[low.snapshots.length-1].observed_remaining_credits=10;
 assert.equal(decide({...baseline,ledger:low,today:'2026-10-31'}).ignore,true);
 const after=decide({...baseline,ledger,today:'2026-11-15'});
 assert.equal(after.ignore,true);
 assert.match(after.reason,/expired/i);
});

test('owner-managed release control requires the explicit owner approval policy flag',()=>{
 const copy=structuredClone(ledger);
 copy.release_policy.explicit_publish_approval_per_release=false;
 const result=decide({...baseline,ledger:copy,today:'2026-10-31'});
 assert.equal(result.ignore,true);
 assert.match(result.reason,/Owner approval/);
});
