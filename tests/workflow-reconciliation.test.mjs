import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const text=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(text(p));
const matrix=json('docs/APPROVAL_COVERAGE_MATRIX.json');
const manifest=json('docs/audits/2026-10-23-archive-manifest.json');
const old=json(matrix.historical_snapshot);
const projection=m=>m.contracts.map(({id,decision_key,assertions})=>({id,decision_key,assertions}));
const uniqueOwnerKeys=keys=>new Set(keys).size===keys.length;
test('workflow cleanup preserves exact historical blobs, not paraphrased evidence',()=>{
 for(const [name,sha] of Object.entries(manifest.blobs)){
  const bytes=readFileSync(new URL('../'+manifest.directory+'/'+name,import.meta.url));
  const actual=createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length),Buffer.from([0])])).update(bytes).digest('hex');
  assert.equal(actual,sha,name+' must retain original Git blob');
 }
});
test('reconciliation retains every classified owner key and source assertion',()=>{
 for(const key of old.owner_decision_key_inventory)assert.ok(matrix.owner_decision_key_inventory.includes(key),'missing historical owner decision '+key);
 assert.deepEqual(matrix.owner_decision_key_inventory,[...matrix.owner_decision_key_inventory].sort(),'current inventory remains sorted');
 assert.ok(uniqueOwnerKeys(matrix.owner_decision_key_inventory),'current inventory must not duplicate owner decision keys');
 // Preserve unchanged archived contracts. The owner superseded only the
 // old first-expansion once-only UI gate, retaining its historical snapshot.
 const retiredId='first_coffee_expansion_one_time_style';
 const originalIds=new Set(old.contracts.map(item=>item.id).filter(id=>id!==retiredId));
 const historical={contracts:matrix.contracts.filter(item=>originalIds.has(item.id))};
 const original=projection(old).filter(row=>row.id!==retiredId).map(row=>row.id==='fast_flow_sixth_style_hybrid'?{
  ...row,assertions:row.assertions.map(a=>a.path==='site/cloud/main.js'&&a.contains==="C.STYLES.filter(style=>style!=='Custom')"?
   {...a,contains:'C.STYLES,suggestion.style'}:a)
 }:row);
 assert.deepEqual(projection(historical),original);
 for(const key of ['locked_count','open_count','fnv1a32'])assert.equal(matrix.original_baseline[key],old.original_baseline[key]);
 assert.equal(historical.contracts.length,14);
 assert.equal(historical.contracts.reduce((sum,item)=>sum+item.assertions.length,0),59);
 const next=matrix.contracts.find(item=>item.id==='first_coffee_expansion_until_first_shot');
 assert.equal(next.decision_key,'current_owner_first_shot_style_until_logged_20261108');
 assert.ok(next.assertions.some(a=>a.path==='site/cloud/main.js'&&a.contains?.includes('const firstStyle=!s.shots.some(')));
 assert.equal(old.contracts.find(item=>item.id===retiredId).hosted_sql_applied,false,
  'immutable archive records then-unapplied SQL without rewriting historical status');
 assert.equal(next.hosted_sql_applied,true,'active contract preserves later hosted SQL state');
});
test('owner decision key duplicate negative control',()=>{
 const keys=matrix.owner_decision_key_inventory;
 assert.equal(uniqueOwnerKeys([...keys,keys.at(-1)]),false);
});
test('production evidence survives compact current view without a new release grant',()=>{
 for(const key of ['exact_source_sha','tested_application_source_sha','netlify_deploy_id'])assert.equal(matrix.production[key],old.production[key]);
 for(const key of ['id','tested_source_sha','actual_production_git_sha','netlify_deploy_id','claim_consumed_once'])assert.equal(matrix.production.pending_release[key],old.production.pending_release[key]);
 assert.equal(matrix.production.pending_release.claim_consumed_once,true);
 assert.equal(matrix.deployment_approval_policy.new_release_status,'NO_NEW_RELEASE_AUTHORIZED');
 assert.equal(matrix.contracts.find(x=>x.id==='fast_flow_sixth_style_hybrid').production_migration_version,'20261022163126');
 assert.equal(matrix.contracts.find(x=>x.id==='first_coffee_expansion_until_first_shot').hosted_sql_applied,true);
 assert.equal(matrix.contracts.find(x=>x.id==='first_coffee_expansion_until_first_shot').site_published,false);
});
test('current metadata cannot revive retired credit, device, dose or notification-evidence gates',()=>{
 assert.equal(matrix.netlify_credit_owner_only.assistant_balance_check_required,false);
 assert.equal(matrix.netlify_credit_owner_only.minimum_balance_gate,false);
 assert.equal(matrix.netlify_credit_owner_only.request_credit_evidence,false);
 assert.equal(matrix.netlify_credit_owner_only.netlify_build_credit_gate,false);
 assert.equal(matrix.single_instruction_approval_policy.readiness_report_is_not_second_approval,true);
 assert.equal(matrix.single_instruction_approval_policy.owner_device_testing,'NOT_REQUIRED');
 assert.match(matrix.sitewide_direct_save_policy.current_dose_policy,/New shot only.*more than 2 g.*no repeat on historical edit/);
 assert.ok(matrix.contracts.every(x=>x.device_acceptance.startsWith('RETIRED_NOT_REQUIRED')));
 assert.ok(matrix.active_gap_flags.some(x=>x.id==='multi_worker_release_guard'&&x.issue===27));
 const delivery=matrix.active_gap_flags.find(x=>x.id==='backup_watchdog_delivery_channels');
 assert.equal(delivery.issue,28);
 assert.equal(delivery.status,'METADATA_DISCREPANCY_NATURAL_ALERT_DELIVERY_UNVERIFIED');
 assert.equal(delivery.owner_global_notifications_enabled,'ACCEPTED_PREVIOUS_PROOF');
 assert.equal(delivery.disabled_delivery_proven,false);
 assert.equal(delivery.request_owner_reconfirmation,false);
 assert.equal(matrix.private_hide_shot_retirement_deferral.candidate_migration_applied,false);
});
