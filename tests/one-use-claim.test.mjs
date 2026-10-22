import test from 'node:test';
import assert from 'node:assert/strict';
import {planSingleUseClaim,assertProductionClaim,assertReadyForRelease,RELEASE_BRANCH} from '../scripts/release/one-use-claim.mjs';
const SOURCE='1'.repeat(40),OTHER='2'.repeat(40),NOW='2026-10-20T22:00:00Z',ID='DIC-20261020-ONE123';
const grant={id:ID,tested_source_sha:SOURCE,owner_approved:true,status:'APPROVED',
 production_branch:RELEASE_BRANCH,max_publications:1,
 approved_at_utc:'2026-10-20T21:00:00Z',expires_at_utc:'2026-10-21T21:00:00Z',
 approval_source:'Explicit owner message in verified GitHub decision ledger'};
const blank=()=>({schema_version:1,consumed:[]});
const claim=(overrides={})=>planSingleUseClaim({grant,releaseId:ID,sourceSha:SOURCE,nowIso:NOW,
 ledger:blank(),currentPublishedSourceSha:OTHER,...overrides});
test('fresh exact owner grant creates one immutable consumed claim',()=>{
 const res=claim();
 assert.equal(res.consumed.length,1);
 assert.equal(res.consumed[0].id,ID);
 assert.equal(res.consumed[0].tested_source_sha,SOURCE);
 assert.deepEqual(blank().consumed,[]);
 assert.equal(assertProductionClaim({ledger:res,grant,sourceSha:SOURCE,nowIso:NOW,
  commitSubject:'Release DIC: '+ID+' [dic-publish]'}),true);
});
test('replayed approval cannot be used again even after unrelated later release',()=>{
 const res=claim();
 assert.throws(()=>claim({ledger:res}),/already consumed/);
 const later={...res,consumed:[...res.consumed,{id:'DIC-20261020-TWO456',tested_source_sha:OTHER}]};
 assert.throws(()=>claim({ledger:later}),/already consumed/);
});
test('new release ID cannot redeploy same exact source to bypass the one-use claim',()=>{
 const old={...blank(),consumed:[{id:'DIC-20261020-TWO456',tested_source_sha:SOURCE}]};
 assert.throws(()=>claim({ledger:old}),/already published/);
 assert.throws(()=>claim({currentPublishedSourceSha:SOURCE}),/redundant/);
});
test('wrong source, missing owner approval, expiry, provenance and route fail closed',()=>{
 assert.throws(()=>claim({sourceSha:OTHER}),/exact tested source/);
 assert.throws(()=>claim({grant:{...grant,owner_approved:false}}),/explicit owner/);
 assert.throws(()=>claim({grant:{...grant,expires_at_utc:'2026-10-20T21:30:00Z'}}),/expired/);
 assert.throws(()=>claim({grant:{...grant,approval_source:''}}),/provenance/);
 assert.throws(()=>claim({grant:{...grant,production_branch:'development\/backend-foundation'}}),/unsafe branch/);
});
test('old credit-limit fields in historical grants are ignored, not required',()=>{
 assert.equal(claim({grant:{...grant,estimated_credits_limit:0}}).consumed.length,1);
 assert.equal(claim({grant:{...grant,estimated_credits_limit:100000}}).consumed.length,1);
});
test('damaged ledger, reuse and forged deploy subject are rejected',()=>{
 assert.throws(()=>claim({ledger:{schema_version:0,consumed:[]}}),/ledger unavailable/);
 assert.throws(()=>claim({ledger:{schema_version:1,consumed:[{id:'BAD',tested_source_sha:OTHER}]}}),/corrupt/);
 const ledger=claim();
 assert.throws(()=>assertProductionClaim({ledger,grant,sourceSha:SOURCE,nowIso:NOW,
  commitSubject:'Release DIC: '+ID+' [skip netlify]'}),/subject/);
 assert.throws(()=>assertProductionClaim({ledger,grant,sourceSha:OTHER,nowIso:NOW,
  commitSubject:'Release DIC: '+ID+' [dic-publish]'}),/does not match/);
});
test('free private compensating release requires genuine exact-source five green checks and routed production',()=>{
 const good={approval:'success',validate:'success','cloud-tests':'success',
  'mobile-browser-qa':'success',sql:'success'};
 const flags={githubPrivateBranchProtectionVerified:false,
  githubPrivateFreeCompensatingControlsVerified:true,
  netlifyProductionBranchVerified:true,defaultBranchRunnerVerified:true};
 assert.equal(assertReadyForRelease({requiredChecks:good,flags}),true);
 assert.throws(()=>assertReadyForRelease({requiredChecks:good,flags:{
  ...flags,githubPrivateFreeCompensatingControlsVerified:false}}),/compensating controls/);
 assert.throws(()=>assertReadyForRelease({requiredChecks:good,flags:{
  ...flags,netlifyProductionBranchVerified:false}}),/not independently verified/);
 assert.throws(()=>assertReadyForRelease({requiredChecks:{...good,sql:'missing'},flags}),/not green: sql/);
 assert.equal(assertReadyForRelease({requiredChecks:good,flags:{
  ...flags,githubPrivateBranchProtectionVerified:true,
  githubPrivateFreeCompensatingControlsVerified:false}}),true);
});
