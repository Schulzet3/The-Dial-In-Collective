import test from 'node:test';
import assert from 'node:assert/strict';
import {communitySummary} from '../site/lib/engine.js';

// Synthetic local helper fixtures; no database, member or hosted Community access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,overrides={})=>({
 id,contributorId:'contributor-'+id,dialedIn:true,outlierReview:'not_needed',
 doseG:18,yieldG:36,tasteScales:{...green},notes:'Original private note',
 ...overrides
});
const empty={shotCount:0,contributors:0,ratio:null,confirmed:false,confidence:'Early Data'};

test('#455 Community summary rejects stale true markers without original five ideal numeric ratings',()=>{
 for(const overrides of [
  {tasteScales:null},{tasteScales:{...green,sweetness:null}},
  {tasteScales:{...green,clarity:4}},{tasteScales:{...green,astringency:2}},
  {tasteScales:{...green,body:'3'}},{dialedIn:'true'},{dialedIn:1}
 ]){
  const input=[shot('historical',overrides)],before=structuredClone(input);
  assert.deepEqual(communitySummary(input),empty,JSON.stringify(overrides));
  assert.deepEqual(input,before,'historical scores, measurements and private notes are immutable');
 }
});

test('#455 genuine all-five-green Community evidence retains contributor-balanced ratios and confirmation',()=>{
 const input=[shot('one'),shot('two',{yieldG:45}),shot('stale',{
  tasteScales:{...green,body:4},yieldG:170
 })];
 const before=structuredClone(input);
 const got=communitySummary(input);
 assert.equal(got.shotCount,2);
 assert.equal(got.contributors,2);
 assert.equal(got.ratio,2.25);
 assert.equal(got.confirmed,true);
 assert.equal(got.confidence,'Moderate Confidence');
 assert.deepEqual(input,before);
});

test('#455 pending outlier review never qualifies even with five true green ratings',()=>{
 const input=[shot('pending',{outlierReview:'pending'}),shot('good')];
 assert.deepEqual(communitySummary(input),{
  shotCount:1,contributors:1,ratio:2,confirmed:false,confidence:'Early Data'
 });
 assert.deepEqual(communitySummary([shot('pending',{outlierReview:'pending'})]),empty);
});

test('#455 valid multiple shots from one contributor retain existing contributor cap',()=>{
 const input=[shot('one'),shot('two',{contributorId:'contributor-one',yieldG:54})];
 const got=communitySummary(input);
 assert.equal(got.shotCount,2);
 assert.equal(got.contributors,1);
 assert.equal(got.ratio,2.5);
 assert.equal(got.confirmed,false);
 assert.equal(got.confidence,'Early Data');
});
