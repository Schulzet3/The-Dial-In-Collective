import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditApprovalCoverage,checkRepository} from '../scripts/audit/approval-coverage.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const matrix=JSON.parse(file('docs/APPROVAL_COVERAGE_MATRIX.json'));
const ledger=JSON.parse(file('docs/DECISION_LEDGER.json'));
const check=(changes={})=>auditApprovalCoverage({matrix,ledger,...changes});
test('every current owner decision is inventoried and approved UI source/contracts exist',()=>{
 assert.equal(checkRepository().ownerDecisions,matrix.owner_decision_key_inventory.length);
 assert.deepEqual(check(),[]);
});
test('forgotten owner-approved decision key fails closed until classified',()=>{
 const copy={...ledger,current_owner_new_approved_feature_20990101:{status:'Locked'}};
 assert.match(check({ledger:copy}).join(' '),/owner decision keys changed/);
});
test('missing grinder i or exact help on New Setup fails source contract even if another screen has an icon',()=>{
 const broken=file('site/cloud/main.js').replace('data-action="grinder-range-info"','data-action="missing-i"');
 const errors=check({source:path=>path==='site/cloud/main.js'?broken:file(path)});
 assert.match(errors.join(' '),/grinder_range_new_setup:.*missing approved source/);
});
test('missing real browser interaction check fails even if source text still contains the icon',()=>{
 const broken=file('tests/browser/cloud_owner_qa.py').replace('Real 390px New Setup grinder i opens and closes exact help','screenshot only');
 assert.match(check({source:path=>path==='tests/browser/cloud_owner_qa.py'?broken:file(path)}).join(' '),/grinder_range_new_setup/);
});
test('removed selected-family single visible UI cannot silently return',()=>{
 const broken=file('site/cloud/main.js')+'\n'+ 'alternateRecipesMarkup(';
 assert.match(check({source:path=>path==='site/cloud/main.js'?broken:file(path)}).join(' '),/internal_single_visible_recipe/);
});
test('published source SHA or one-use receipt drift fails without reading billing data',()=>{
 const m=structuredClone(matrix);m.production.pending_release.actual_production_git_sha='not-live';
 assert.match(check({matrix:m}).join(' '),/release_receipt/);
 const source=path=>{
  if(path==='docs/NETLIFY_CREDIT_LEDGER.json')throw Error('credit ledger must not be read');
  if(path==='docs/RELEASE_CONSUMPTION.json')return JSON.stringify({schema_version:1,consumed:[]});
  return file(path);
 };
 assert.match(check({source}).join(' '),/release_receipt/);
 assert.deepEqual(check({source:path=>{
  if(path==='docs/NETLIFY_CREDIT_LEDGER.json')throw Error('credit ledger must not be read');
  return file(path);
 }}),[]);
});
test('unverified cross-user privacy and duplicated worker publishes remain explicitly tracked',()=>{
 const m=structuredClone(matrix);
 m.active_gap_flags=m.active_gap_flags.filter(x=>x.id!=='multi_worker_release_guard');
 assert.match(check({matrix:m}).join(' '),/open_gaps/);
});

test('all original baseline Locked/Open decisions are preserved as an immutable corpus',()=>{
 const entry=matrix.original_baseline;
 assert.equal(entry.locked_count,79);assert.equal(entry.open_count,20);
 const modified=structuredClone(ledger);
 modified.baseline.content.locked[0].decision='Core loop unexpectedly changed';
 assert.match(check({ledger:modified}).join(' '),/baseline/);
});

test('owner explicitly rules out GitHub Pro/public; Project instructions reflect advisory Free/private controls',()=>{
 const instructions=file('docs/CHATGPT_PROJECT_INSTRUCTIONS_TO_PASTE_2026-10-20.md');
 const spec=file('docs/MASTER_SPECIFICATION.md');
 assert.match(instructions,/repository \*\*private on GitHub Free\*\*/);
 assert.match(instructions,/Do not recommend upgrading or making it public/);
 assert.match(instructions,/CI and branch protections.*advisory/);
 assert.match(instructions,/I alone monitor Netlify credits/);
 assert.match(instructions,/Never request a balance screenshot/);
 assert.match(instructions,/Proactively recommend Project Instructions changes/);
 assert.match(spec,/Owner-Locked GitHub Free\/private operating constraint/);
 assert.ok(Object.hasOwn(ledger,'current_owner_github_free_private_no_upgrade_20261020'));
});
