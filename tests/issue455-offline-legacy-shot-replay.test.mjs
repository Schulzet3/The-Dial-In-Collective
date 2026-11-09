import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';
import {saveShot} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

// R455-146: entirely synthetic old/offline data; no member or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const raw=rawFixture();
 raw.shots=[rawShot({id:'saved-legacy',style:'Custom',feed_mode:'standard'})];
 const s=hydrate(raw);
 s.shots[0].notes='Original private note';
 return s;
}
test('R146 duplicate historical Custom shot replays its immutable record before NEW-shot style validation',()=>{
 const s=fixture(),existing=s.shots[0],before=structuredClone(s);
 const replay=saveShot(s,'coffee',structuredClone(existing));
 assert.strictEqual(replay,existing);
 assert.deepEqual(s,before,'no duplicate, audit, family, rating or preference mutation');
 assert.equal(replay.style,'Custom');
 assert.equal(replay.notes,'Original private note');
 assert.deepEqual(replay.tasteScales,green);
});
test('R146 already saved partial legacy ratings return the original without inventing green',()=>{
 const s=fixture();s.shots[0].tasteScales.sweetness=null;
 s.shots[0].dialedIn=false;
 const before=structuredClone(s),existing=s.shots[0];
 assert.strictEqual(saveShot(s,'coffee',structuredClone(existing)),existing);
 assert.deepEqual(s,before);
 assert.equal(existing.tasteScales.sweetness,null);
 assert.equal(existing.dialedIn,false);
});
test('R146 duplicate ID of a DIFFERENT coffee is rejected before legacy validation',()=>{
 const s=fixture();s.coffees.push({...s.coffees[0],id:'different-coffee',name:'Other coffee'});
 const before=structuredClone(s);
 assert.throws(()=>saveShot(s,'different-coffee',structuredClone(s.shots[0])),/different coffee/);
 assert.deepEqual(s,before,'no foreign-coffee original or preference change');
});
test('R146 fresh Custom shot remains disallowed and cannot skip required five ratings',()=>{
 const s=fixture(),before=structuredClone(s),original=structuredClone(s.shots[0]);
 assert.throws(()=>saveShot(s,'coffee',{...original,id:'new-retired-style'}),/available shot style/);
 assert.throws(()=>saveShot(s,'coffee',{...original,id:'new-unrated',style:'Turbo',
  tasteScales:{...green,sweetness:null}}),/Rate all five taste scales/);
 assert.deepEqual(s,before,'fresh invalid entries never create shot/audit/preferences');
});
test('R146 valid new shot still saves once and exact replay remains idempotent',()=>{
 const s=fixture(),basket=activeVersion(s).baskets[0];
 const input={id:'new-turbo',basketId:basket.id,style:'Turbo',feedMode:'standard',
  doseG:18,yieldG:42,timeS:19,grindSetting:1.2,tempC:null,tasteScales:green,notes:'new private note'};
 const first=saveShot(s,'coffee',input);
 const before=structuredClone(s),len=s.shots.length;
 assert.equal(first.id,'new-turbo');
 assert.strictEqual(saveShot(s,'coffee',structuredClone(first)),first);
 assert.equal(s.shots.length,len);
 assert.deepEqual(s,before);
});
