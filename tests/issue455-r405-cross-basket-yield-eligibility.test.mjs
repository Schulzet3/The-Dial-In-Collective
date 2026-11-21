import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,coffeeState,validateShot} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {recipeGrid} from '../site/lib/ui.js';
import {CONFIG} from '../site/lib/constants.js';

// Only synthetic hydrated state: never member, Auth, database or provider reads.
const GREEN={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture({ratio=6,green=true,manual=false,originDose=18,originBasket='basketv',currentDose=40}={}){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 v.baskets.push({id:'basket-b',name:'Other active basket',doseG:currentDose,archived:false});
 v.baskets.find(b=>b.id==='basketv').doseG=originDose;
 s.families.push({id:'family-l',coffeeId:'coffee',style:'Lungo',
  seedRatio:ratio,createdAt:'2026-11-19T12:00:00Z'});
 s.shots.push({id:'success-a',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:originBasket,style:'Lungo',
  feedMode:'standard',familyId:'family-l',doseG:originDose,
  yieldG:originDose*ratio,timeS:36,grindSetting:1.2,tempC:93,
  timestamp:'2026-11-19T12:01:00Z',hidden:false,dialedIn:true,
  notes:'Keep exact private history and all five ratings',
  tasteScales:{...GREEN,sweetness:green?5:null}});
 if(manual){
  const p=coffeeState(s,'coffee');
  p.currentFamilies.Lungo='family-l';
  p.favoriteShots['family-l']='success-a';
 }
 return s;
}
const selected=(s,basketId='basket-b')=>recommendation(s,'coffee',{
 style:'Lungo',basketId,feedMode:'standard',ignoreAdvice:true
});
test('R405 negative: cross-basket 18/108 success must not display a 240 g unloggable recipe',()=>{
 const s=fixture(),before=structuredClone(s);
 const historical=s.shots[0],unloggable={...historical,yieldG:240};
 assert.match(validateShot(unloggable).join(' '),/yield.*200 g/i);
 const r=selected(s),reference=selected(fixture({green:false}));
 assert.equal(r.yield.center,reference.yield.center,'reuse approved starting style/roast rule');
 assert.ok(r.yield.center>=CONFIG.bounds.yieldG[0]&&r.yield.center<=CONFIG.bounds.yieldG[1]);
 assert.equal(r.source,'Starting recommendation');
 assert.equal(r.familyId,null,'do not advertise unloggable transferred success');
 assert.match(r.basketCompatibilityNote,/saved successful recipe.*basket dose/i);
 assert.match(recipeGrid(r),/saved successful recipe cannot be used at this basket dose/i);
 const cloud=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(cloud,/success&&!rec\.basketCompatibilityNote\?'Your Dialed In Window':'Starting Recommendation'/);
 assert.deepEqual(s,before,'original five scores, notes, selected family and history never mutate');
});
test('R405 positive: original measured basket remains genuine local 108 g success',()=>{
 const s=fixture(),original=structuredClone(s),r=selected(s,'basketv');
 assert.equal(r.yield.center,108);
 assert.equal(r.familyId,'family-l');
 assert.equal(r.source,'Your dialed in window');
 assert.equal(r.basketCompatibilityNote,undefined);
 assert.deepEqual(s,original);
});
test('R405 positive: loggable transferred 18/36 recipe remains selectable at 40 g',()=>{
 const s=fixture({ratio:2}),original=structuredClone(s),r=selected(s);
 assert.equal(r.yield.center,80);
 assert.equal(r.ratio.center,2);
 assert.equal(r.familyId,'family-l');
 assert.equal(r.basketCompatibilityNote,undefined);
 assert.deepEqual(s,original);
});
test('R405 negative and controls: five tastes needed, saved manual favorite retained without mutation',()=>{
 const missing=fixture({green:false}),untouched=structuredClone(missing);
 assert.equal(selected(missing).familyId,null);
 assert.deepEqual(missing,untouched);
 const manual=fixture({manual:true}),before=structuredClone(manual),r=selected(manual);
 assert.equal(r.familyId,null,'inapplicable favorite stays in History but is not an unloggable current target');
 assert.equal(manual.shots[0].yieldG,108);
 assert.deepEqual(manual,before,'do not rewrite the saved family, favorite or original shot');
});
test('R405 inclusive upper Log Shot boundary remains valid; no arbitrary new ratio cutoff',()=>{
 const s=fixture({ratio:5,originDose:18}),original=structuredClone(s),r=selected(s);
 assert.equal(r.yield.center,200);
 assert.equal(r.familyId,'family-l');
 assert.equal(r.basketCompatibilityNote,undefined);
 assert.ok(r.yield.high<=CONFIG.bounds.yieldG[1]);
 assert.deepEqual(s,original);
});
test('R405 lower entry boundary: valid 40/5 history never suggests 0.6 g for 5 g basket',()=>{
 const s=fixture({originDose:40,ratio:.125,currentDose:5});
 const original=structuredClone(s),r=selected(s),reference=selected(fixture({originDose:40,ratio:.125,currentDose:5,green:false}));
 assert.equal(s.shots[0].yieldG,5);
 assert.equal(r.yield.center,reference.yield.center);
 assert.ok(r.yield.center>=CONFIG.bounds.yieldG[0]);
 assert.match(r.basketCompatibilityNote,/saved successful recipe/i);
 assert.deepEqual(s,original);
});
