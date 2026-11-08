import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {personalSimilarCoffeeReference,recommendation} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

// Synthetic archival records only: no hosted Community, Auth, or member access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(records=[],{targetRoast='Light',donorRoast='Light'}={}){
 const s=hydrate(rawFixture()),target=s.coffees[0],v=activeVersion(s);
 target.roastLevel=targetRoast;
 const donor={...structuredClone(target),id:'donor',name:'Unrelated other coffee',roastLevel:donorRoast};
 s.coffees.push(donor);
 for(const [i,overrides] of records.entries())s.shots.push({
  id:'old-'+i,coffeeId:'donor',setupVersionId:v.id,style:'Turbo',basketId:'basketv',
  feedMode:'standard',hidden:false,dialedIn:true,tasteScales:{...green},
  doseG:18,yieldG:54,timeS:16,notes:'Retain original historical note',
  ...overrides
 });
 return {s,target,v};
}
const prior=({s,target,v})=>personalSimilarCoffeeReference(s,target,v,'Turbo','standard','basketv');

test('#455 R077 invalid historical yields cannot seed a similar-coffee recipe',()=>{
 for(const overrides of [
  {yieldG:0},{yieldG:-10},{yieldG:null},{yieldG:NaN},{yieldG:Infinity},
  {yieldG:'54'},{doseG:0},{doseG:Number.MIN_VALUE}
 ]){
  const f=fixture([overrides]),before=structuredClone(f.s);
  assert.equal(prior(f),null,'invalid physical quantity: '+JSON.stringify(overrides));
  assert.deepEqual(f.s,before,'never rewrite original data or notes');
 }
});

test('#455 R077 an invalid same-roast donor cannot bias displayed starting ratio',()=>{
 const f=fixture([{yieldG:0}]),before=structuredClone(f.s);
 const rec=recommendation(f.s,f.target.id,{style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true});
 assert.equal(rec.source,'Starting recommendation');
 assert.equal(rec.communityEvidence,undefined);
 assert.equal(rec.observations,0);
 assert.deepEqual(f.s,before);
});

test('#455 R077 valid five-green measured successes remain usable and unchanged',()=>{
 const f=fixture([{}]),before=structuredClone(f.s);
 const p=prior(f);
 assert.equal(p.ratio,3);
 assert.equal(p.time,16);
 assert.equal(p.count,1);
 assert.equal(p.coffees,1);
 const rec=recommendation(f.s,f.target.id,{style:'Turbo',basketId:'basketv',feedMode:'standard',ignoreAdvice:true});
 assert.equal(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.observations,1);
 assert.deepEqual(f.s,before);
});

test('#455 R077 malformed records cannot inflate samples or distort valid median',()=>{
 const f=fixture([{}, {yieldG:0}, {yieldG:-36}, {doseG:Number.MIN_VALUE}]);
 const before=structuredClone(f.s);
 const p=prior(f);
 assert.equal(p.ratio,3);
 assert.equal(p.time,16);
 assert.equal(p.count,1);
 assert.deepEqual(f.s,before);
});

test('#455 R077 preserve five ratings, style, feed, setup and roast applicability',()=>{
 const f=fixture([{}, {style:'Traditional'}, {feedMode:'slow'},
  {setupVersionId:'other'}, {tasteScales:{...green,sweetness:4}},
  {tasteScales:{...green,clarity:null}}]);
 assert.equal(prior(f).count,1,'only original matching five-green physical measurements count');
 const adjacent=fixture([{}],{targetRoast:'Ultra Light',donorRoast:'Very Light'});
 assert.equal(prior(adjacent).nearby,true,'approved neighboring light-roast fallback preserved');
 const remote=fixture([{}],{targetRoast:'Medium',donorRoast:'Light'});
 assert.equal(prior(remote),null,'do not transfer across unrelated roast groups');
});
