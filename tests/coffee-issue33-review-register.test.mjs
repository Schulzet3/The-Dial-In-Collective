import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const register=JSON.parse(readFileSync(new URL('../docs/audits/extractor-issue33-independent-77-review-register.json',import.meta.url)));
const canon=JSON.parse(readFileSync(new URL('../docs/audits/extractor-issue33-owner-missing-field-decisions-20261027.json',import.meta.url)));
test('original numbered 77 review register remains unique and stable without editing frozen603',()=>{
 assert.equal(register.records.length,77);
 assert.deepEqual(register.records.map(r=>r.number),Array.from({length:77},(_,i)=>i+1));
 assert.equal(new Set(register.records.map(r=>r.original_product_url)).size,77);
 assert.equal(register.immutable603_source_sha256,'696c011e97e94eb2a9ec1b12c66efdf1ce15636d7df999751279bb0f381cce52');
});
test('only existing canonical #1-5 are claimed implemented; later reverse review is not source acceptance',()=>{
 assert.equal(canon.cases.length,5);
 for(let i=0;i<77;i++){
  const r=register.records[i],c=canon.cases.find(x=>x.sequence===r.number);
  assert.equal(r.owner_authority==='CANONICAL_APPROVED',!!c);
  if(!c){
   assert.equal(r.implementation_status,'NOT_VERIFIED_FOR_INDIVIDUAL_COFFEE');
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
 assert.match(reused.current_official_source.status,/IDENTITY_CONFLICT/);
});
