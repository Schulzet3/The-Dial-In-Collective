import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeSetup,activeVersion,feedMode,validateBackup,reviseSetup,addBasket} from '../site/lib/model.js';
import {prefill,recommendation,saveShot} from '../site/lib/engine.js';

// R194: historic, optional absent equipment-control object; synthetic fixture only.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),v=activeVersion(s),setup=activeSetup(s),basket=v.baskets[0];
 delete v.advanced;
 return {s,v,setup,basket};
}
test('R194 legacy backup accepts absent optional advanced without changing its data',()=>{
 const {s,v}=fixture(),original=structuredClone(s);
 assert.deepEqual(validateBackup(s),original);
 assert.equal(feedMode(v),'standard');
 v.slowFeed=true;
 assert.equal(feedMode(v),'standard','untracked feed preference cannot silently enable slow mode');
});
test('R194 legacy Log Shot prefill and recommendation keep all five inputs unrated',()=>{
 const {s,v,basket}=fixture(),original=structuredClone(s);
 const p=prefill(s,'coffee',{style:'Turbo',basketId:basket.id});
 assert.equal(p.tempC,null);
 assert.equal(p.feedMode,'standard');
 assert.equal(p.timeS,'');
 assert.equal(p.yieldG,'');
 assert.deepEqual(p.tasteScales,{extraction:null,body:null,clarity:null,sweetness:null,astringency:null});
 const rec=recommendation(s,'coffee',{style:'Turbo',basketId:basket.id});
 assert.ok(rec,'a usable unmeasured starting recommendation must exist');
 assert.deepEqual(s,original,'read-only advice must not silently rewrite equipment or history');
 assert.equal(v.advanced,undefined);
});
test('R194 legacy Log Shot saves all five green ratings and exact notes without optional temperature tracking',()=>{
 const {s,v,basket}=fixture();
 const saved=saveShot(s,'coffee',{
  id:'r194-legacy-shot',style:'Turbo',basketId:basket.id,feedMode:'standard',
  doseG:18,yieldG:72,timeS:50,grindSetting:1.5,tempC:93,
  tasteScales:green,notes:'Preserve the original private tasting note'
 });
 assert.equal(saved.dialedIn,true);
 assert.deepEqual(saved.tasteScales,green);
 assert.equal(saved.notes,'Preserve the original private tasting note');
 assert.equal(saved.tempC,null,'untracked temperature must remain disabled rather than inferred');
 assert.equal(saved.feedMode,'standard');
 assert.equal(s.shots.length,1);
 assert.equal(v.advanced,undefined,'saving a shot must not mutate legacy equipment toggles');
});
test('R194 explicitly editing legacy setup creates only missing optional switches and preserves history',()=>{
 const {s,v,setup,basket}=fixture();
 const before=structuredClone(s);
 reviseSetup(s,{
  name:setup.name,machine:v.machine,grinder:v.grinder,burrs:v.burrs,
  grinderMin:v.grinderMin,grinderMax:v.grinderMax,basketDoseG:basket.doseG,
  tempUnit:v.tempUnit,temperature:false,slowFeed:false,baskets:false
 });
 assert.deepEqual(v.advanced,{temperature:false,slowFeed:false,baskets:false});
 assert.equal(s.setups.length,before.setups.length);
 assert.deepEqual(s.shots,before.shots);
});
test('R194 adding a basket to legacy setup enables only the requested basket control',()=>{
 const {s,v}=fixture();
 const b=addBasket(s,{name:'Extra basket',doseG:18});
 assert.equal(b.name,'Extra basket');
 assert.deepEqual(v.advanced,{temperature:false,slowFeed:false,baskets:true});
 assert.equal(v.baskets.length,2);
});
test('R194 valid modern equipment toggles still control slow-feed and temperature',()=>{
 const {s,v,basket}=fixture();
 v.advanced={temperature:true,slowFeed:true,baskets:false};
 v.slowFeed=true;
 assert.equal(feedMode(v),'slow');
 const p=prefill(s,'coffee',{style:'Turbo',basketId:basket.id});
 assert.equal(p.feedMode,'slow');
 const saved=saveShot(s,'coffee',{
  id:'r194-modern-shot',style:'Turbo',basketId:basket.id,feedMode:'slow',
  doseG:18,yieldG:40,timeS:16,grindSetting:1.5,tempC:93,
  tasteScales:green,notes:'Temperature explicitly tracked'
 });
 assert.equal(saved.tempC,93);
 assert.equal(saved.feedMode,'slow');
 assert.equal(v.slowFeed,true);
});
