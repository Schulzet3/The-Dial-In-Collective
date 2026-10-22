import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceDossier,REQUIRED_CHECKS} from '../scripts/audit/source-release-dossier.mjs';
const sha='a'.repeat(40);
const nowIso='2026-10-22T06:00:00Z';
const grant=(overrides={})=>({
 id:'DIC-20261022-SOURCE01',tested_source_sha:sha,owner_approved:true,status:'APPROVED',
 production_branch:'release/production',max_publications:1,estimated_credits_limit:15,
 approved_at_utc:'2026-10-22T05:00:00Z',expires_at_utc:'2026-10-22T07:00:00Z',
 approval_source:'Synthetic owner approval fixture; no publication authorized',...overrides
});
const data=()=>({
 sourceSha:sha,nowIso,
 matrix:{production:{exact_source_sha:'b'.repeat(40),netlify_deploy_id:'DEPLOY'}},
 credits:{release_policy:{last_published_release:{published_commit_sha:'b'.repeat(40),
  deploy_id:'DEPLOY',release_id:'G0',netlify_status:'ready/current'}}},
 grants:{grants:[]},consumption:{schema_version:1,consumed:[]}
});
test('source dossier is HOLD even with a matching owner grant, not an executable release authorization',()=>{
 const v=data();v.grants.grants=[grant()];
 const d=buildSourceDossier(v);
 assert.equal(d.release_ready,false);assert.equal(d.release_disposition,'HOLD_EXTERNAL_PREFLIGHT');
 assert.equal(d.available_exact_source_grant_id,grant().id);assert.equal(d.private_github_free_checks_enforced,false);
 assert.deepEqual(d.required_checks,REQUIRED_CHECKS);
 assert.ok(d.pending_live_evidence.some(x=>x.includes('credit balance')));
 assert.equal(d.current_recorded_production.provider_live_read_this_run,false);
 assert.deepEqual(v.consumption,{schema_version:1,consumed:[]});
});
test('a spent, duplicate, absent or wrong SHA grant never becomes eligible',()=>{
 const v=data();v.grants.grants=[grant()];
 v.consumption.consumed=[{id:grant().id,tested_source_sha:sha}];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.consumption.consumed=[];v.grants.grants.push(grant({id:'DIC-20261022-SOURCE02'}));
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.grants.grants=[grant({owner_approved:false})];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.grants.grants=[grant({tested_source_sha:'c'.repeat(40)})];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.grants.grants=[];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
});
test('source dossier never offers an expired, revoked, future or malformed grant',()=>{
 for(const override of [
  {expires_at_utc:nowIso},
  {status:'REVOKED'},
  {approved_at_utc:'2026-10-22T06:01:00Z'},
  {approval_source:''},
  {production_branch:'main'}
 ]){
  const v=data();v.grants.grants=[grant(override)];
  const result=buildSourceDossier(v);
  assert.equal(result.available_exact_source_grant_id,null,JSON.stringify(override));
  assert.equal(result.release_ready,false);
 }
});
test('an incomplete ledger or differently named consumed grant cannot offer the same published source',()=>{
 const v=data();v.grants.grants=[grant()];
 v.consumption.consumed=[{id:'DIC-20261022-EARLIER1',tested_source_sha:sha}];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.consumption={};
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
});
test('mismatched production receipt or non-Git source fails closed',()=>{
 const v=data();v.credits.release_policy.last_published_release.deploy_id='OTHER';
 assert.throws(()=>buildSourceDossier(v),/Release receipt mismatch/);
 const q=data();q.sourceSha='HEAD';
 assert.throws(()=>buildSourceDossier(q),/40-character Git HEAD/);
});
