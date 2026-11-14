import test from 'node:test';
import assert from 'node:assert/strict';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';
import {hydrate,applyPending,shotPayload} from '../site/cloud/mapping.js';
import {shotCard} from '../site/cloud/shot_card.js';

// Synthetic owner-local shot only. No provider, member, telemetry or production use.
const five={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const context={kind:'member_selected_starting_reference',
 source_label:'Your successful starting recipe',used_controls:['grind']};
const when='2026-11-14T10:25:00Z';
function sample(origin=context){
 const original=hydrate(rawFixture());
 const draft={id:'r255-offline-shot',timestamp:when,doseG:18,yieldG:36,
  timeS:25,grindSetting:2.5,tempC:null,basketId:'basketv',style:'Turbo',
  feedMode:'standard',tasteScales:{...five},notes:'Private synthetic note',
  recommendationContext:origin};
 const payload=shotPayload(original,'coffee',draft);
 const event={owner:'synthetic-owner',id:'synthetic-event',status:'pending',action:'save_shot',payload};
 return {original,payload,event};
}
test('R255 pending offline shot shows the exact already-queued recommendation-use source',()=>{
 const {original,payload,event}=sample(),before=structuredClone(original);
 const queued=structuredClone(event),preview=applyPending(original,[event]);
 assert.equal(preview.shots.length,1);
 const sh=preview.shots[0];
 assert.equal(sh.cloudPending,true);
 assert.deepEqual(sh.recommendationContext,context);
 assert.deepEqual(sh.tasteScales,five);
 assert.equal(sh.notes,'Private synthetic note');
 assert.equal(sh.doseG,18);assert.equal(sh.yieldG,36);assert.equal(sh.timeS,25);
 assert.equal(sh.grindSetting,2.5);assert.equal(sh.feedMode,'standard');
 const html=shotCard(sh,{expanded:true,activeVersionId:'version'});
 assert.match(html,/Pending Sync/);
 assert.match(html,/data-recommendation-source/);
 assert.match(html,/Used grind from: Your successful starting recipe/);
 assert.match(html,/A saved starting reference, not independent source verification/);
 assert.deepEqual(original,before,'offline preview must not mutate cache');
 assert.deepEqual(event,queued,'queued original and its ID are immutable');
 assert.deepEqual(payload.recommendation_context,context);
});
test('R255 pending shot without copied suggestion never invents recommendation provenance',()=>{
 const {original,event}=sample(null);
 assert.equal(Object.hasOwn(event.payload,'recommendation_context'),false);
 const pending=applyPending(original,[event]).shots[0];
 assert.equal(pending.recommendationContext,undefined);
 assert.doesNotMatch(shotCard(pending,{expanded:true}),/data-recommendation-source/);
 assert.deepEqual(pending.tasteScales,five);
});
test('R255 pending preview equals server hydration for existing sourced context, without an outcome claim',()=>{
 const {original,event}=sample();
 const pending=applyPending(original,[event]).shots[0];
 const raw=rawFixture();
 raw.shots.push(rawShot({id:event.payload.id,pulled_at:when,
  dose_g:18,yield_g:36,time_s:25,grind_setting:2.5,
  feed_mode:'standard',recommendation_context:structuredClone(context)}));
 const restored=hydrate(raw).shots.find(sh=>sh.id===event.payload.id);
 assert.deepEqual(pending.recommendationContext,restored.recommendationContext);
 assert.deepEqual(pending.tasteScales,restored.tasteScales);
 assert.equal(pending.notes,'Private synthetic note');
 assert.equal(pending.cloudPending,true);
 assert.equal(restored.cloudPending,undefined);
});
test('R255 replay remains idempotent; invalid fifth rating cannot create a fake sourced preview',()=>{
 const {original,event}=sample(),before=structuredClone(original);
 const twice=applyPending(original,[event,event]);
 assert.equal(twice.shots.length,1);
 assert.deepEqual(twice.shots[0].recommendationContext,context);
 const bad=structuredClone(event);bad.payload.id='invalid-r255';
 bad.payload.taste.sweetness=null;
 const rejected=applyPending(original,[bad]);
 assert.equal(rejected.shots.length,0);
 assert.deepEqual(original,before);
 assert.deepEqual(bad.payload.recommendation_context,context,'durable queue is unmodified');
});
