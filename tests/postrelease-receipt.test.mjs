import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPublishedRelease,summarizeFailedChecks,recoveryIndex} from '../scripts/audit/postrelease-receipt.mjs';
const a='a'.repeat(40),b='b'.repeat(40);
const input=()=>({expected_release_sha:b,tested_source_sha:a,github_release_head:b,netlify:{state:'ready',current:true,commit_ref:b},claim:{source_sha:a,release_sha:b,consumed_once:true},expected_migrations:['20261009190246'],actual_migrations:['20261009190246'],data_integrity:{independent:true,result:'PASS'}});
test('postrelease proof never equates source tests to real device acceptance',()=>{
 const good=verifyPublishedRelease(input());
 assert.equal(good.status,'PROVIDER_SOURCE_VERIFIED');
 assert.equal(good.device_acceptance,'SEPARATE_OWNER_EVIDENCE_REQUIRED');
 const bad=input();bad.netlify.commit_ref=a;
 assert.equal(verifyPublishedRelease(bad).status,'UNVERIFIED');
 const missing=input();missing.actual_migrations=[];
 assert.equal(verifyPublishedRelease(missing).status,'UNVERIFIED');
 const broken=input();broken.claim.consumed_once=false;
 assert.equal(verifyPublishedRelease(broken).status,'UNVERIFIED');
});
test('safe failure receipt contains only job and step names',()=>{
 const result=summarizeFailedChecks({run_id:123,jobs:[{name:'lint',conclusion:'failure',steps:[{name:'ESLint zero warnings',conclusion:'failure'},{name:'checkout',conclusion:'success'}]},{name:'approval',conclusion:'success'}]});
 assert.equal(result.failed.length,1);
 assert.deepEqual(result.failed[0].steps,['ESLint zero warnings']);
 assert.match(result.note,/Do not automatically retry/);
});
test('compact recovery checkpoint requires verified exact branch hashes',()=>{
 const params={checked_at_utc:'2026-10-22T00:00:00Z',development:a,main:b,release:a,published:b,next_action:'Reconcile current source checks'};
 const result=recoveryIndex(params);
 assert.equal(result.scope,'NON_AUTHORITATIVE_RECOVERY_INDEX');
 assert.match(result.disclaimer,/never replaces/);
 assert.throws(()=>recoveryIndex({...params,main:'stale'}),/main SHA/);
});
