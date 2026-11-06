import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';

// Isolated synthetic archived history. No member/provider access or mutation.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const current=(coffeeId,extra={})=>({
 id:'current',coffeeId,style:'Turbo',setupVersionId:'version',
 doseG:18,yieldG:36,timeS:20,...extra
});
const archived=(id,coffeeId,extra={})=>({
 id,coffeeId,style:'Turbo',setupVersionId:'version',hidden:false,
 dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:60,
 notes:'Keep original private note',...extra
});
const add=(shots,coffeeId,n,extra={})=>{
 for(let i=0;i<n;i++)shots.push(archived('prior-'+shots.length,coffeeId,extra));
};

test('#455 R076 four old zero-dose ratios cannot fabricate a new outlier',()=>{
 const s={shots:[]};add(s.shots,'coffee',4,{doseG:0});
 const before=structuredClone(s);
 assert.equal(isExtreme(s,current('coffee')),false);
 assert.deepEqual(s,before,'no historical measurements, ratings or notes rewritten');
});

test('#455 R076 nonfinite measured ratio or invalid time cannot seed a reference median',()=>{
 for(const extra of [
  {doseG:null},{doseG:-1},{doseG:NaN},{doseG:Infinity},
  {yieldG:Infinity},{yieldG:null},{yieldG:-5},
  {doseG:Number.MIN_VALUE,yieldG:36},
  {timeS:-300},{timeS:NaN},{timeS:Infinity}
 ]){
  const s={shots:[]};add(s.shots,'coffee',4,extra);
  const before=structuredClone(s);
  assert.equal(isExtreme(s,current('coffee')),false,JSON.stringify(extra));
  assert.deepEqual(s,before);
 }
});

test('#455 R076 a malformed fourth record cannot meet the four-reference quorum',()=>{
 const s={shots:[]};add(s.shots,'coffee',3);
 s.shots.push(archived('malformed','coffee',{doseG:'18'}));
 const before=structuredClone(s);
 assert.equal(isExtreme(s,current('coffee')),false);
 assert.deepEqual(s,before);
 s.shots.push(archived('fourth-valid','coffee'));
 assert.equal(isExtreme(s,current('coffee')),true,'four genuine measured prior shots keep the original time threshold');
});

test('#455 R076 valid historical ratio/time thresholds and context boundaries are unchanged',()=>{
 const s={shots:[]};add(s.shots,'coffee',4,{timeS:20});
 const before=structuredClone(s);
 assert.equal(isExtreme(s,current('coffee',{yieldG:58.5})),false);
 assert.equal(isExtreme(s,current('coffee',{yieldG:63})),true);
 assert.equal(isExtreme(s,current('coffee',{timeS:46})),true);
 assert.equal(isExtreme(s,current('coffee',{style:'Traditional',yieldG:63})),false);
 assert.equal(isExtreme(s,current('coffee',{setupVersionId:'other',yieldG:63})),false);
 assert.equal(isExtreme(s,current('different-coffee',{yieldG:63})),false);
 assert.deepEqual(s,before);
});

test('#455 R076 actual shot-save outlier flag ignores corrupt archive without editing it',()=>{
 const s=hydrate(rawFixture()),coffee=s.coffees[0];
 add(s.shots,coffee.id,4,{doseG:0});
 const originals=structuredClone(s.shots);
 const saved=saveShot(s,coffee.id,{
  basketId:'basketv',style:'Turbo',doseG:18,yieldG:36,timeS:20,
  grindSetting:1,feedMode:'standard',notes:'New private note',
  tasteScales:{...green,sweetness:4}
 });
 assert.equal(saved.outlierReview,'not_needed');
 assert.equal(saved.dialedIn,false);
 assert.equal(saved.notes,'New private note');
 assert.deepEqual(s.shots.slice(0,originals.length),originals);
});
