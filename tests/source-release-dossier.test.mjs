import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSourceDossier,REQUIRED_CHECKS} from '../scripts/audit/source-release-dossier.mjs';
const sha='a'.repeat(40);
const data=()=>({
 sourceSha:sha,
 matrix:{production:{exact_source_sha:'b'.repeat(40),netlify_deploy_id:'DEPLOY'}},
 credits:{release_policy:{last_published_release:{published_commit_sha:'b'.repeat(40),
  deploy_id:'DEPLOY',release_id:'G0',netlify_status:'ready/current'}}},
 grants:{grants:[]},consumption:{consumed:[]}
});
test('source dossier is HOLD even with a matching owner grant, not an executable release authorization',()=>{
 const v=data();v.grants.grants=[{id:'G1',tested_source_sha:sha,owner_approved:true,max_publications:1}];
 const d=buildSourceDossier(v);
 assert.equal(d.release_ready,false);assert.equal(d.release_disposition,'HOLD_EXTERNAL_PREFLIGHT');
 assert.equal(d.available_exact_source_grant_id,'G1');assert.equal(d.private_github_free_checks_enforced,false);
 assert.deepEqual(d.required_checks,REQUIRED_CHECKS);
 assert.ok(d.pending_live_evidence.some(x=>x.includes('credit balance')));
 assert.equal(d.current_recorded_production.provider_live_read_this_run,false);
});
test('a spent, duplicate, absent or wrong SHA grant never becomes eligible',()=>{
 const v=data();v.grants.grants=[{id:'G1',owner_approved:true,max_publications:1,tested_source_sha:sha}];
 v.consumption.consumed=[{id:'G1'}];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.consumption.consumed=[];v.grants.grants.push({...v.grants.grants[0],id:'G2'});
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
 v.grants.grants=[{id:'G3',owner_approved:false,max_publications:1,tested_source_sha:sha}];
 assert.equal(buildSourceDossier(v).available_exact_source_grant_id,null);
});
test('mismatched production receipt or non-Git source fails closed',()=>{
 const v=data();v.credits.release_policy.last_published_release.deploy_id='OTHER';
 assert.throws(()=>buildSourceDossier(v),/Release receipt mismatch/);
 const q=data();q.sourceSha='HEAD';
 assert.throws(()=>buildSourceDossier(q),/40-character Git HEAD/);
});
