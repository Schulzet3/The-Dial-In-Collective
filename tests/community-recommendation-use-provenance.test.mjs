import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';
import {shotCard} from '../site/cloud/shot_card.js';
const context={kind:'member_selected_starting_reference',
 source_label:'Unproven exact Community starting reference',
 used_controls:['grind'],community_tier:'exact',
 contributor_count:3,shot_count:7,source_verified_independently:false};
test('Use Recommendation origin stays with authenticated/offline shot payload',()=>{
 const s=hydrate(rawFixture()),d={id:'fixture-shot',style:'Turbo',basketId:'basketv',
  doseG:18,yieldG:40,timeS:27,grindSetting:1.4,tempC:92,feedMode:'standard',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  notes:'private',recommendationContext:context};
 const payload=shotPayload(s,'coffee',d);
 assert.deepEqual(payload.recommendation_context,context);
 assert.equal(payload.notes,'private');
});
test('Provenance survives saved state hydration and uses escaped display',()=>{
 const raw=rawFixture();raw.shots=[rawShot({id:'test-origin',recommendation_context:{
  ...context,source_label:'Unproven <img src=x onerror=alert(1)> starting reference'}})];
 const shot=hydrate(raw).shots[0];
 assert.deepEqual(shot.recommendationContext.used_controls,['grind']);
 const html=shotCard(shot,{expanded:true,activeVersionId:shot.setupVersionId});
 assert.match(html,/data-recommendation-source/);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/not independent source verification/);
});
test('Historical shots lacking provenance never gain an invented source',()=>{
 const raw=rawFixture();raw.shots=[rawShot({id:'no-origin'})];
 const shot=hydrate(raw).shots[0];
 assert.equal(shot.recommendationContext,null);
 assert.doesNotMatch(shotCard(shot,{expanded:true}),/data-recommendation-source/);
});
