import test from 'node:test';
import assert from 'node:assert/strict';
import {selectCommunityPrior} from '../site/lib/community-evidence.js';

const valid=(overrides={})=>({style:'Turbo',tier:'exact',source:'eligible_verified_community',
 calibrated_grind:false,contributor_count:2,shot_count:4,ratio:2.6,time_s:18,...overrides});
const pick=candidates=>selectCommunityPrior({style:'Turbo',candidates},'Turbo');

test('boolean ratio and time cannot outrank a real verified Community numeric measurement',()=>{
 for(const bad of [valid({ratio:true,contributor_count:7,shot_count:8}),
  valid({time_s:true,contributor_count:7,shot_count:8})]){
  const items=[bad,valid()];const original=JSON.stringify(items);
  const chosen=pick(items);
  assert.equal(chosen.ratio,2.6);
  assert.equal(chosen.time,18);
  assert.equal(chosen.contributorCount,2);
  assert.equal(JSON.stringify(items),original,'do not rewrite retained source data');
 }
});

test('arrays and objects with coercible numeric representations are not verified physical readings',()=>{
 for(const bad of [valid({ratio:[2.7]}),valid({time_s:[22]}),
  valid({ratio:{valueOf:()=>2.7}}),valid({time_s:{valueOf:()=>22}})]){
  assert.equal(pick([bad]),null);
 }
});

test('legacy decimal string values remain usable and original inclusive time bounds are preserved',()=>{
 const chosen=pick([valid({ratio:' 2.75 ',time_s:' 21 '})]);
 assert.equal(chosen.ratio,2.75);
 assert.equal(chosen.time,21);
 assert.equal(pick([valid({ratio:1.4,time_s:1})]).time,1);
 assert.equal(pick([valid({ratio:2.0,time_s:180})]).time,180);
 assert.equal(pick([valid({ratio:0.5})]),null);
 assert.equal(pick([valid({ratio:8})]),null);
});

test('empty and nonnumeric strings are ineligible rather than silent zero or type coercion',()=>{
 for(const value of ['', '  ', 'not-a-reading', 'Infinity']){
  assert.equal(pick([valid({ratio:value})]),null);
  assert.equal(pick([valid({time_s:value})]),null);
 }
});
