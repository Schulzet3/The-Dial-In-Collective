import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {saveShot,recommendation,prefill} from '../site/lib/engine.js';

// R455-153: isolated synthetic hydrated setup, not a hosted member or provider write.
const state=()=>hydrate(rawFixture());
const shot=(s,other={})=>({
 id:'r455-153-test-shot',timestamp:'2026-11-09T16:30:00-07:00',
 doseG:18,yieldG:36,timeS:8,grindSetting:1.2,tempC:null,
 basketId:activeVersion(s).baskets.find(b=>!b.archived).id,
 style:'Turbo',feedMode:'standard',notes:'Private original note',
 tasteScales:{extraction:1,body:3,clarity:5,sweetness:5,astringency:1},
 ...other
});
test('R153 invalid explicit timestamps fail before shot, preference or audit mutations',()=>{
 const s=state(),before=structuredClone(s);
 for(const timestamp of ['definitely-not-a-date','   ',42]){
  assert.throws(()=>saveShot(s,'coffee',shot(s,{timestamp})),/valid shot date\/time/);
  assert.deepEqual(s,before,'invalid timestamp must not partially save or change private state');
 }
});
test('R153 explicit offset time is preserved and eligible for same-context advice and prefill',()=>{
 const s=state(),input=shot(s),saved=saveShot(s,'coffee',input);
 assert.equal(saved.timestamp,input.timestamp);
 assert.equal(saved.notes,'Private original note');
 assert.deepEqual(saved.tasteScales,input.tasteScales);
 assert.equal(s.shots.length,1);
 const rec=recommendation(s,'coffee',{style:'Turbo',basketId:input.basketId,feedMode:'standard'});
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(prefill(s,'coffee',{style:'Turbo',basketId:input.basketId,feedMode:'standard'}).grindSetting,1.2);
});
test('R153 missing timestamp still receives an actual instant',()=>{
 const s=state(),input=shot(s);delete input.timestamp;
 const saved=saveShot(s,'coffee',input);
 assert.ok(Number.isFinite(Date.parse(saved.timestamp)));
 assert.equal(s.shots.length,1);
});
test('R153 same-coffee existing-ID offline replay leaves historical malformed date untouched',()=>{
 const s=state(),prior={id:'historical-legacy',coffeeId:'coffee',timestamp:'legacy unknown',
  notes:'Do not alter this private history',tasteScales:{extraction:null}};
 s.shots.push(prior);
 const before=structuredClone(s);
 const replay=saveShot(s,'coffee',shot(s,{id:'historical-legacy',timestamp:'legacy unknown'}));
 assert.strictEqual(replay,prior);
 assert.deepEqual(s,before,'a saved historical record must remain immutable on replay');
});
