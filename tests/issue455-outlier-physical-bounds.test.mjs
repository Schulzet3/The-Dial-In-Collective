import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {isExtreme,saveShot} from '../site/lib/engine.js';

// Synthetic imported records only. Do not alter any real member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const oldShot=(id,extra={})=>({
 id,coffeeId:'coffee',style:'Turbo',setupVersionId:'version',
 hidden:false,dialedIn:true,tasteScales:{...green},
 doseG:18,yieldG:36,timeS:20,notes:'Preserve this original note',...extra
});
const current=(extra={})=>({
 id:'new',coffeeId:'coffee',style:'Turbo',setupVersionId:'version',
 doseG:18,yieldG:36,timeS:50,...extra
});
const history=(n,extra={})=>Array.from({length:n},(_,i)=>oldShot('old-'+i,extra));

test('#455 R089 outside-bound positive archive cannot meet mandatory outlier quorum',()=>{
 const variants=[{doseG:2},{doseG:41},{yieldG:2},{yieldG:230},{timeS:.5},{timeS:181}];
 for(const extra of variants){
  const s={shots:history(4,extra)},before=structuredClone(s);
  assert.equal(isExtreme(s,current()),false,JSON.stringify(extra));
  assert.deepEqual(s,before,'private source shots and notes are immutable');
 }
});

test('#455 R089 fourth physical-invalid archived record does not create a false prompt',()=>{
 const s={shots:history(3)};
 s.shots.push(oldShot('fourth',{yieldG:230}));
 const before=structuredClone(s);
 assert.equal(isExtreme(s,current()),false);
 assert.deepEqual(s,before);
 s.shots.push(oldShot('fourth-valid'));
 assert.equal(isExtreme(s,current()),true,'four physically valid all-green records still trigger genuine time review');
});

test('#455 R089 invalid records cannot skew median when four genuinely measured ones exist',()=>{
 const s={shots:[...history(4),...history(4,{timeS:181}).map((x,i)=>({...x,id:'corrupt-'+i}))]};
 const before=structuredClone(s);
 assert.equal(isExtreme(s,current({timeS:40})),false,
  'valid history at 20s differs by only 20s; corrupt 181s observations cannot skew the reference');
 assert.deepEqual(s,before);
});

test('#455 R089 inclusive existing minimum and maximum entry bounds remain valid',()=>{
 for(const readings of [{doseG:5,yieldG:200,timeS:180},{doseG:40,yieldG:5,timeS:1}]){
  const s={shots:history(4,readings)};
  assert.equal(isExtreme(s,current()),true,JSON.stringify(readings));
 }
});

test('#455 R089 owner Locked ratio and time outlier thresholds remain exactly unchanged',()=>{
 const s={shots:history(4)},before=structuredClone(s);
 assert.equal(isExtreme(s,current({timeS:45,yieldG:58.5})),false,'exact 25s and ratio 1.25 deviations are not extreme');
 assert.equal(isExtreme(s,current({timeS:46})),true,'above 25s remains extreme');
 assert.equal(isExtreme(s,current({timeS:20,yieldG:63})),true,'above 1.25 ratio remains extreme');
 assert.deepEqual(s,before);
});

test('#455 R089 wrong coffee, style, setup, hidden, or incomplete rating does not fill quorum',()=>{
 const variants=[
  {coffeeId:'other'},{style:'Traditional'},{setupVersionId:'old-version'},
  {hidden:true},{tasteScales:{...green,sweetness:null}},{dialedIn:false}
 ];
 for(const extra of variants){
  const s={shots:[...history(3),oldShot('other',extra)]};
  assert.equal(isExtreme(s,current()),false,JSON.stringify(extra));
 }
});

test('#455 R089 saveShot review and archived notes preserve genuine four-shot safety',()=>{
 for(const fourthValid of [false,true]){
  const s=hydrate(rawFixture()),coffee=s.coffees[0],v=activeVersion(s);
  s.shots=[];
  const stored=history(3).map(x=>({...x,coffeeId:coffee.id,setupVersionId:v.id}));
  stored.push({...oldShot('fourth',{yieldG:fourthValid?36:230}),
   coffeeId:coffee.id,setupVersionId:v.id});
  s.shots.push(...stored);
  const original=structuredClone(s.shots);
  const saved=saveShot(s,coffee.id,{
   basketId:'basketv',style:'Turbo',doseG:18,yieldG:63,timeS:20,
   grindSetting:1,feedMode:'standard',notes:'Keep new private note',
   tasteScales:{...green,sweetness:4}
  });
  assert.equal(saved.outlierReview,fourthValid?'pending':'not_needed');
  assert.equal(saved.notes,'Keep new private note');
  assert.deepEqual(s.shots.slice(0,original.length),original);
 }
});
