import test from 'node:test';
import assert from 'node:assert/strict';
import {isExtreme,saveShot} from '../site/lib/engine.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';

// Synthetic data only. No member or hosted provider operations.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const basis={coffeeId:'coffee',style:'Turbo',setupVersionId:'version',
 basketId:'basket',feedMode:'standard',calibrationId:'cal',
 doseG:18,yieldG:36,timeS:20};
const prior=(id,extra={})=>({id,...basis,hidden:false,dialedIn:true,
 tasteScales:{...green},notes:'Original private historical note',...extra});
const current=(extra={})=>({...basis,id:'new',timeS:50,...extra});
const history=(n,extra={})=>Array.from({length:n},(_,i)=>prior('prior-'+i,extra));

test('#455 R097 different recorded feed, basket, or calibration cannot form outlier quorum',()=>{
 for(const [key,value] of [['feedMode','slow'],['basketId','other-basket'],['calibrationId','old-cal']]){
  const shots=history(4),before=structuredClone(shots);
  assert.equal(isExtreme({shots},current({[key]:value})),false,key);
  assert.deepEqual(shots,before,'original private history and five ratings unchanged');
 }
});

test('#455 R097 a mismatched fourth reference does not satisfy four comparable successes',()=>{
 for(const [key,value] of [['feedMode','slow'],['basketId','other-basket'],['calibrationId','old-cal']]){
  const shots=[...history(3),prior('fourth',{[key]:value})];
  assert.equal(isExtreme({shots},current()),false,key);
  shots.push(prior('fourth-matching'));
  assert.equal(isExtreme({shots},current()),true,'four matching measured successes still trigger the existing time threshold');
 }
});

test('#455 R097 four truly matching references retain all old ratio and time boundaries',()=>{
 const shots=history(4),before=structuredClone(shots);
 assert.equal(isExtreme({shots},current({timeS:45,yieldG:58.5})),false);
 assert.equal(isExtreme({shots},current({timeS:46,yieldG:36})),true);
 assert.equal(isExtreme({shots},current({timeS:20,yieldG:63})),true);
 assert.deepEqual(shots,before);
});

test('#455 R097 unrecorded legacy contexts retain existing conservative historical fallback',()=>{
 const shots=history(4,{feedMode:undefined,basketId:undefined,calibrationId:undefined});
 const before=structuredClone(shots);
 assert.equal(isExtreme({shots},current()),true,'unknown archives retain prior treatment, not silently rewritten');
 assert.deepEqual(shots,before);
});

test('#455 R097 saveShot integrates feed-scoped baseline without modifying original notes',()=>{
 for(const [feedMode,expected] of [['slow','not_needed'],['standard','pending']]){
  const s=hydrate(rawFixture()),c=s.coffees[0],v=activeVersion(s);
  s.shots=history(4).map(x=>({...x,coffeeId:c.id,setupVersionId:v.id,
   calibrationId:v.calibrationId,basketId:'basketv'}));
  const before=structuredClone(s.shots);
  const saved=saveShot(s,c.id,{basketId:'basketv',style:'Turbo',feedMode,
   doseG:18,yieldG:36,timeS:50,grindSetting:1,notes:'New private shot note',
   tasteScales:{...green,sweetness:4}});
  assert.equal(saved.outlierReview,expected);
  assert.equal(saved.notes,'New private shot note');
  assert.deepEqual(s.shots.slice(0,4),before);
 }
});
