import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const register=JSON.parse(readFileSync(new URL('../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url)));
const canon=JSON.parse(readFileSync(new URL('../docs/audits/extractor-issue33-owner-missing-field-decisions-20261027.json',import.meta.url)));
const releaseQueue=JSON.parse(readFileSync(new URL('../docs/RELEASE_QUEUE.json',import.meta.url)));
const roastScope=releaseQueue.items.find(row=>row.id==='DIC-Q-33-selected-roast-over-catalog-tags');
const imageScope=releaseQueue.items.find(row=>row.id==='DIC-Q-33-selected-image-relative-roast');
test('original numbered 77 review register remains unique and stable without editing frozen603',()=>{
 assert.equal(register.records.length,77);
 assert.deepEqual(register.records.map(r=>r.number),Array.from({length:77},(_,i)=>i+1));
 assert.equal(new Set(register.records.map(r=>r.original_product_url)).size,77);
 assert.equal(register.immutable603_source_sha256,'696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52');
});
test('canonical owner approvals stay distinct from bounded individual source fixes and remaining review-only coffees',()=>{
 assert.equal(canon.cases.length,5);
 for(let i=0;i<77;i++){
  const r=register.records[i],c=canon.cases.find(x=>x.sequence===r.number);
  assert.equal(r.owner_authority==='CANONICAL_APPROVED',!!c);
  if(!c){
   if(r.number===77){
    assert.ok(roastScope,'Coffee #77 implementation must be tracked in release queue');
    const expectedStatus=roastScope.merged_source_sha?'MERGED_PR190':'TESTED_PR190_AWAITING_MERGE';
    assert.equal(r.implementation_status,expectedStatus);
    assert.match(r.tests.original603,/603\/603/);
   }
   else if(r.number===6){
    assert.equal(r.implementation_status,'EXISTING_SELECTED_PRODUCT_HANDLER_FOCUSED_REGRESSION_NO_NEW_CODE');
    assert.equal(r.release_status,'REVIEW_RESOLVED_SOURCE_ABSENT_NO_DEPLOYABLE_CHANGE');
    assert.match(r.current_official_source.status,/TOLIMA_PAGE_SNAPSHOT_PROCESS_UNPUBLISHED/);
    assert.match(r.current_official_source.finding,/FUDAM/);
   }else if([7,9].includes(r.number)){
    assert.ok(imageScope,'Image roast enhancement must have distinct release-queue row');
    const expectedStatus=imageScope.merged_source_sha?'MERGED_PR191':'CANDIDATE_PR191_FOCUSED_REGRESSIONS_PASS_FULL603_PENDING';
    assert.equal(r.implementation_status,expectedStatus);
    assert.match(r.current_official_source.finding,/relative|lighter/i);
    assert.match(r.release_status,/TESTING|READY/);
   }else assert.equal(r.implementation_status,'NOT_VERIFIED_FOR_INDIVIDUAL_COFFEE');
   assert.notEqual(r.release_status,'READY');
  }
 }
});
test('direct owner decisions #49 and #72 remain separate from ambiguous #71 producer note',()=>{
 const get=n=>register.records[n-1];
 assert.equal(get(49).owner_authority,'OWNER_APPROVED_FROM_REVERSE_HANDOFF');
 assert.equal(get(72).owner_authority,'OWNER_APPROVED_FROM_REVERSE_HANDOFF');
 assert.notEqual(get(71).owner_authority,'OWNER_APPROVED_FROM_REVERSE_HANDOFF');
 assert.match(get(72).current_official_source.finding,/ACODIHUE/);
 assert.match(get(71).original_missing_claim,/Smallholder/);
});
test('review tracks cannot overlap and raw product identity cannot be substituted',()=>{
 const forward=register.records.filter(x=>x.review_track==='FORWARD_EXCLUSIVE_NEXT_REVIEW').map(x=>x.number);
 const reverse=register.records.filter(x=>x.review_track==='REVERSE_EXCLUSIVE').map(x=>x.number);
 assert.equal(forward.length,36);assert.equal(reverse.length,36);
 assert.equal(forward.at(-1)+1,reverse[0]);
 const reused=register.records[5];
 assert.match(reused.current_official_source.finding,/Tolima/);
 assert.match(reused.current_official_source.status,/TOLIMA_PAGE_SNAPSHOT_PROCESS_UNPUBLISHED/);
 assert.match(reused.current_official_source.finding,/FUDAM/);
 assert.match(reused.blocking_evidence,/not a verified live Shopify/i);
});
