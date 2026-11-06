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
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
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

test('confirmed member families provide distinct evidence without falsely verifying cross-member identity',()=>{
 const {s,id}=create();
 const candidates=[
  {tier:'exact',style:'Turbo',ratio:2.3,time_s:28,shot_count:4,contributor_count:2,
   confirmed_personal_family_count:2,confirmed_family_contributors:2,
   distinct_family_basis:'confirmed_personal_families_in_observed_ratio_group',
   community_group_identity_verified:false,source:'eligible_verified_community',calibrated_grind:false},
  {tier:'exact',style:'Turbo',ratio:3.0,time_s:19,shot_count:2,contributor_count:1,
   confirmed_personal_family_count:1,confirmed_family_contributors:1,
   distinct_family_basis:'confirmed_personal_families_in_observed_ratio_group',
   community_group_identity_verified:false,source:'eligible_verified_community',calibrated_grind:false}
 ];
 s.communityEvidence={[id]:{Turbo:{style:'Turbo',candidates}}};
 const prior=selectCommunityPrior(s.communityEvidence[id].Turbo,'Turbo');
 assert.equal(prior.confirmedPersonalFamilyCount,2);
 assert.equal(prior.confirmedFamilyContributors,2);
 assert.equal(prior.communityGroupIdentityVerified,false);
 assert.equal(prior.contributorCount,2);
 const rec=recommendation(s,id);
 assert.equal(rec.communityEvidence.ratioFamiliesAreEstimated,true);
 assert.equal(rec.established,false);
 assert.equal(rec.familyId,null);
});
test('invalid Community confirmed-family metadata cannot outrank verified integer counts',()=>{
 const base={tier:'exact',style:'Turbo',ratio:3.8,time_s:25,shot_count:8,contributor_count:2,
  source:'eligible_verified_community',calibrated_grind:false};
 const established={...base,ratio:1.8,confirmed_personal_family_count:2};
 for(const invalid of ['999999',-5,2.5,Infinity]){
  const malformed={...base,confirmed_personal_family_count:invalid};
  for(const order of [[malformed,established],[established,malformed]]){
   const selected=selectCommunityPrior({style:'Turbo',candidates:order},'Turbo');
   assert.equal(selected.ratio,1.8);
   assert.equal(selected.confirmedPersonalFamilyCount,2);
   assert.equal(selected.communityGroupIdentityVerified,false);
  }
  assert.equal(selectCommunityPrior({style:'Turbo',candidates:[malformed]},'Turbo').confirmedPersonalFamilyCount,0);
 }
});
