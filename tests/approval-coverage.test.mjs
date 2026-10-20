import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditApprovalCoverage,checkRepository} from '../scripts/audit/approval-coverage.mjs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const matrix=JSON.parse(file('docs/APPROVAL_COVERAGE_MATRIX.json'));
const ledger=JSON.parse(file('docs/DECISION_LEDGER.json'));
const credits=JSON.parse(file('docs/NETLIFY_CREDIT_LEDGER.json'));
const check=(changes={})=>auditApprovalCoverage({matrix,ledger,credits,...changes});
test('every current owner decision is inventoried and approved UI source/contracts exist',()=>{
 assert.equal(checkRepository().ownerDecisions,29);
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
test('published source SHA drift between Netlify receipt and matrix fails closed',()=>{
 const c=structuredClone(credits);c.release_policy.last_published_release.published_commit_sha='not-live';
 assert.match(check({credits:c}).join(' '),/release_receipt/);
});
test('unverified cross-user privacy and duplicated worker publishes remain explicitly tracked',()=>{
 const m=structuredClone(matrix);
 m.active_gap_flags=m.active_gap_flags.filter(x=>x.id!=='multi_worker_release_guard');
 assert.match(check({matrix:m}).join(' '),/open_gaps/);
});
