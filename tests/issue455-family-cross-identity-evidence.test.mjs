import test from 'node:test';
import assert from 'node:assert/strict';
import {familyShots,familyStats,familiesFor,chooseRecipeFamily,assignFamily} from '../site/lib/engine.js';

// R455-120: synthetic archived family-ID contamination, never real member data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const family=(id='family-a',coffeeId='coffee-a',style='Turbo')=>({id,coffeeId,style});
const shot=(id,patch={})=>({
 id,coffeeId:'coffee-a',style:'Turbo',familyId:'family-a',
 setupVersionId:'version',calibrationId:'cal',basketId:'basket',
 feedMode:'standard',hidden:false,dialedIn:true,tasteScales:{...green},
 doseG:18,yieldG:36,timeS:16,notes:'Keep original private note',...patch
});
const state=(shots,families=[family()])=>({shots,families,preferences:''});
const version={id:'version',calibrationId:'cal',grinder:'example grinder',burrs:'example burr'};
const basket={id:'basket',doseG:18};
const choose=s=>chooseRecipeFamily(s,'coffee-a','Turbo',version,basket,'standard',
 {currentFamilies:{},favoriteShots:{}});

test('R120 wrong-coffee and wrong-style imported rows cannot contaminate a family center',()=>{
 const good=shot('good');
 const s=state([good,
  shot('other-coffee',{coffeeId:'coffee-b',yieldG:72}),
  shot('other-style',{style:'Traditional',yieldG:54})]);
 const before=structuredClone(s);
 assert.deepEqual(familyShots(s,'family-a').map(x=>x.id),['good']);
 const stats=familyStats(s,'family-a');
 assert.equal(stats.count,1);
 assert.equal(stats.confirmed,false);
 assert.equal(stats.ratio.center,2);
 assert.equal(choose(s).ratio,2);
 assert.equal(familiesFor(s,'coffee-a','Turbo').length,1);
 assert.deepEqual(s,before,'original five ratings, notes and all historical records unchanged');
});

test('R120 wrong-coffee-only or wrong-style-only family references are not personal recipe evidence',()=>{
 for(const patch of [{coffeeId:'coffee-b'},{style:'Traditional'}]){
  const s=state([shot('wrong',patch)]),before=structuredClone(s);
  assert.deepEqual(familyShots(s,'family-a'),[]);
  assert.equal(familyStats(s,'family-a'),null);
  assert.deepEqual(familiesFor(s,'coffee-a','Turbo'),[]);
  assert.equal(choose(s),null);
  assert.deepEqual(s,before);
 }
});

test('R120 same-coffee new shot reuses matching valid family despite foreign historic ID',()=>{
 const s=state([shot('good'),shot('wrong-coffee',{coffeeId:'coffee-b',yieldG:72})]);
 const before=structuredClone(s);
 const newShot=shot('incoming',{familyId:null});
 assert.equal(assignFamily(s,newShot),'family-a',
  'a foreign import must not force an unnecessary new recipe family');
 assert.deepEqual(s,before,'family assignment lookup does not alter historical records');
});

test('R120 same-style valid recipes and independent other-style family remain selectable',()=>{
 const s=state([
  shot('a1'),shot('a2',{yieldG:39}),
  shot('traditional',{familyId:'family-traditional',style:'Traditional',yieldG:54}),
  shot('bad-foreign',{familyId:'family-traditional',style:'Turbo',yieldG:72})
 ],[family(),family('family-traditional','coffee-a','Traditional')]);
 const before=structuredClone(s);
 assert.deepEqual(familyShots(s,'family-a').map(x=>x.id),['a1','a2']);
 assert.deepEqual(familyShots(s,'family-traditional').map(x=>x.id),['traditional']);
 assert.equal(familyStats(s,'family-a').count,2);
 assert.equal(familyStats(s,'family-traditional').ratio.center,3);
 assert.equal(choose(s).family.id,'family-a');
 assert.deepEqual(s,before);
});

test('R120 missing/orphan family retains original all-green shot but yields no fabricated family statistics',()=>{
 const s=state([shot('orphan',{familyId:'missing'})]),before=structuredClone(s);
 assert.deepEqual(familyShots(s,'missing'),[]);
 assert.equal(familyStats(s,'missing'),null);
 assert.deepEqual(s,before);
});
