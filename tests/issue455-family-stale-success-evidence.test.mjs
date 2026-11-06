import test from 'node:test';
import assert from 'node:assert/strict';
import {familyShots,familyStats,familiesFor,chooseRecipeFamily} from '../site/lib/engine.js';

// Local archived fixtures only. Never use live member shots or provider writes.
const allGreen={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const family=(style='Turbo')=>({id:'family',coffeeId:'coffee',style});
const shot=(overrides={})=>({
 id:'archived',coffeeId:'coffee',setupVersionId:'version',
 basketId:'basket',calibrationId:'cal',feedMode:'standard',
 familyId:'family',style:'Turbo',hidden:false,dialedIn:true,
 tasteScales:{...allGreen},doseG:18,yieldG:45,timeS:18,grindSetting:3.3,
 notes:'Original private shot note',...overrides
});
const state=(shots,style='Turbo')=>({shots,families:[family(style)]});
const pick=(s,style='Turbo')=>chooseRecipeFamily(s,'coffee',style,
 {id:'version',calibrationId:'cal',grinder:'grinder',burrs:'burrs'},
 {id:'basket'},'standard',{currentFamilies:{},favoriteShots:{}});

test('#455 an incomplete or nonideal archived shot is not personal family evidence',()=>{
 for(const ratings of [
  null,{}, {...allGreen,sweetness:null},{...allGreen,body:4},
  {...allGreen,clarity:'5'},{...allGreen,astringency:0}
 ]){
  const s=state([shot({tasteScales:ratings})]),before=structuredClone(s);
  assert.deepEqual(familyShots(s,'family'),[]);
  assert.equal(familyStats(s,'family'),null);
  assert.deepEqual(familiesFor(s,'coffee','Turbo'),[]);
  assert.equal(pick(s),null,'incomplete archived taste cannot seed a recipe family');
  assert.deepEqual(s,before,'preserve original five ratings and all historical measurements/notes');
 }
});

test('#455 only strict boolean success is eligible, even for five green ratings',()=>{
 for(const dialedIn of [false,null,undefined,'true',1,0]){
  const s=state([shot({dialedIn})]),before=structuredClone(s);
  assert.equal(familyShots(s,'family').length,0);
  assert.equal(pick(s),null);
  assert.deepEqual(s,before);
 }
});

test('#455 genuinely five-green records remain evidence for every historical style',()=>{
 for(const style of ['Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom']){
  const sh=shot({style}),s=state([sh],style),before=structuredClone(s);
  assert.deepEqual(familyShots(s,'family'),[sh]);
  assert.equal(familyStats(s,'family').count,1);
  assert.equal(familyStats(s,'family').ratio.center,2.5);
  assert.equal(familiesFor(s,'coffee',style).length,1);
  const chosen=pick(s,style);
  assert.equal(chosen.family.id,'family');
  assert.equal(chosen.ratio,2.5);
  assert.deepEqual(s,before,'no raw shot or family edits from evidence selection');
 }
});

test('#455 malformed historical ratings cannot move an otherwise valid family center',()=>{
 const bad=shot({id:'stale',tasteScales:{...allGreen,sweetness:null},
  doseG:18,yieldG:180,timeS:81}),
  valid=shot({id:'valid',style:'Turbo'});
 const s=state([bad,valid]),before=structuredClone(s);
 assert.deepEqual(familyShots(s,'family').map(x=>x.id),['valid']);
 assert.equal(familyStats(s,'family').count,1);
 assert.equal(familyStats(s,'family').ratio.center,2.5);
 assert.equal(pick(s).ratio,2.5);
 assert.deepEqual(s,before);
});

test('#455 hidden or cross-family histories stay excluded while genuine same-family ratings remain',()=>{
 const s=state([
  shot({id:'hidden',hidden:true}),
  shot({id:'other-family',familyId:'other'}),
  shot({id:'stale',tasteScales:{...allGreen,astringency:2}}),
  shot({id:'visible',style:'Turbo'})
 ]);
 assert.deepEqual(familyShots(s,'family').map(x=>x.id),['visible']);
});
