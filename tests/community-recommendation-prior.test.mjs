import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';
import {selectCommunityPrior} from '../site/lib/community-evidence.js';
const create=()=>{const s=hydrate(rawFixture());return {s,id:s.coffees[0].id};};
const evidence=(style='Turbo',tier='exact',ratio=2.8)=>({style,candidates:[
 {tier,style,ratio,time_s:21,shot_count:12,contributor_count:3,
  source:'eligible_verified_community',calibrated_grind:false}]});
test('exact verified community changes only unproven ratio/time prior, not personal grind',()=>{
 const {s,id}=create(),before=recommendation(s,id);
 s.communityEvidence={[id]:{Turbo:evidence()}};
 const rec=recommendation(s,id);
 assert.equal(rec.communityEvidence.tier,'exact');
 assert.equal(rec.communityEvidence.shotCount,12);
 assert.equal(rec.communityEvidence.contributorCount,3);
 assert.equal(rec.established,false);
 assert.equal(rec.observations,0);
 assert.notEqual(before.ratio.center,rec.ratio.center);
 assert.equal(rec.grind.value,before.grind.value);
 assert.match(rec.reasons.join(' '),/independent contributors/);
});
test('unmatched style, forged evidence, and missing independent people cannot qualify',()=>{
 const wrong=[evidence('Traditional'),{style:'Turbo',candidates:[{...evidence().candidates[0],source:'unknown'}]},
 {style:'Turbo',candidates:[{...evidence().candidates[0],contributor_count:0}]}];
 for(const c of wrong)assert.equal(selectCommunityPrior(c,'Turbo'),null);
});
test('own successful exact family outranks same coffee community reference',()=>{
 const {s,id}=create();
 s.families.push({id:'personal',coffeeId:id,style:'Turbo'});
 s.shots.push({id:'person-shot',coffeeId:id,setupId:'setup',setupVersionId:'version',
  basketId:'basketv',calibrationId:'cal',style:'Turbo',feedMode:'standard',doseG:18,
  yieldG:36,timeS:30,grindSetting:1.5,hidden:false,dialedIn:true,
  familyId:'personal',timestamp:'2026-10-23T00:00:00Z'});
 s.communityEvidence={[id]:{Turbo:evidence('Turbo','exact',4.5)}};
 const rec=recommendation(s,id);
 assert.equal(rec.familyId,'personal');
 assert.equal(rec.communityEvidence,undefined);
 assert.equal(rec.ratio.center,2);
});
test('a related release is weighted more conservatively than exact, similar weaker still',()=>{
 const {s,id}=create(),before=recommendation(s,id);
 const deltas=[];
 for(const tier of ['exact','related_release','similar_coffee']){
  s.communityEvidence={[id]:{Turbo:evidence('Turbo',tier,3.7)}};
  const rec=recommendation(s,id);
  assert.equal(rec.communityEvidence.tier,tier);
  deltas.push(Math.abs(rec.ratio.center-before.ratio.center));
 }
 assert.ok(deltas[0]>deltas[1]&&deltas[1]>deltas[2],deltas.join(','));
});

test('Community observed ratio groups remain separate unproven references, not confirmed owned families',()=>{
 const {s,id}=create();
 s.communityEvidence={[id]:{Turbo:{style:'Turbo',candidates:[
  {tier:'exact',style:'Turbo',ratio:2.12,time_s:29,shot_count:2,contributor_count:1,distinct_family_basis:'ratio_bucket_observed',source:'eligible_verified_community',calibrated_grind:false},
  {tier:'exact',style:'Turbo',ratio:3.14,time_s:18,shot_count:7,contributor_count:3,distinct_family_basis:'ratio_bucket_observed',source:'eligible_verified_community',calibrated_grind:false}
 ]}}};
 const prior=selectCommunityPrior(s.communityEvidence[id].Turbo,'Turbo');
 assert.equal(prior.ratio,3.14);
 assert.equal(prior.contributorCount,3);
 const rec=recommendation(s,id);
 assert.equal(rec.communityEvidence.ratioFamiliesAreEstimated,true);
 assert.equal(rec.established,false);
 assert.equal(rec.familyId,null);
});
