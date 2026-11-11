import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';
// Only synthetic local fixtures, never a real member or provider.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const fixture=()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],coffee=s.coffees[0];
 s.coffees.push({...coffee,id:'donor',name:'Other light coffee'});
 return {s,v,coffee,basket:v.baskets[0]};
};
const donor=(id,patch={})=>({
 id,coffeeId:'donor',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,
 tasteScales:{...green},doseG:18,yieldG:54,timeS:18,grindSetting:2.5,
 timestamp:'2026-11-09T12:00:00Z',notes:'Original private donor note',...patch
});
const reference=f=>personalSimilarCoffeeReference(f.s,f.coffee,f.v,'Turbo','standard',f.basket.id);
const rec=f=>recommendation(f.s,f.coffee.id,{style:'Turbo',basketId:f.basket.id,feedMode:'standard',ignoreAdvice:true});

test('R184 invalid original grinder scale cannot seed similar-coffee success',()=>{
 const f=fixture();f.s.shots.push(donor('bad',{snapshot:{grinderMin:3,grinderMax:5}}));
 const before=structuredClone(f.s);
 assert.equal(reference(f),null);
 assert.equal(rec(f).source,'Starting recommendation');
 assert.deepEqual(f.s,before);
});
test('R184 reversed historical grinder limits do not establish a donor',()=>{
 const f=fixture();f.s.shots.push(donor('reversed',{snapshot:{grinderMin:5,grinderMax:2}}));
 assert.equal(reference(f),null);
});
test('R184 valid recorded original endpoints remain admissible',()=>{
 for(const setting of [0,5]){
  const f=fixture();f.s.shots.push(donor('valid',{grindSetting:setting,snapshot:{grinderMin:0,grinderMax:5}}));
  assert.deepEqual([reference(f)?.count,reference(f)?.ratio],[1,3]);
  assert.equal(rec(f).source,'Your successful similar coffees on this setup');
 }
});
test('R184 invalid donor cannot skew a valid same-roast reference',()=>{
 const f=fixture();f.s.shots.push(
  donor('valid',{yieldG:54,snapshot:{grinderMin:0,grinderMax:5}}),
  donor('invalid',{yieldG:90,grindSetting:1,snapshot:{grinderMin:3,grinderMax:5}})
 );
 const before=structuredClone(f.s);
 assert.deepEqual([reference(f)?.count,reference(f)?.ratio],[1,3]);
 assert.equal(rec(f).source,'Your successful similar coffees on this setup');
 assert.deepEqual(f.s,before);
});
test('R184 missing optional legacy original snapshot remains compatible',()=>{
 const f=fixture();f.s.shots.push(donor('legacy',{snapshot:null}));
 assert.deepEqual([reference(f)?.count,reference(f)?.ratio],[1,3]);
});
test('R184 original range alone cannot override current comparable grinder range',()=>{
 const f=fixture();f.s.shots.push(donor('outside-today',{grindSetting:6,snapshot:{grinderMin:0,grinderMax:8}}));
 assert.equal(reference(f),null);
});
test('R184 wrong style or feed remains distinct from matched personal evidence',()=>{
 const f=fixture();f.s.shots.push(donor('other-style',{style:'Fast-Flow'}),donor('other-feed',{feedMode:'slow'}));
 assert.equal(reference(f),null);
});
