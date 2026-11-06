import test from 'node:test';
import assert from 'node:assert/strict';
import {communitySummary} from '../site/lib/engine.js';

// Synthetic local-helper history only. No hosted Community, SQL or member data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,overrides={})=>({
 id,contributorId:'contributor-'+id,dialedIn:true,outlierReview:'not_needed',
 doseG:18,yieldG:36,tasteScales:{...green},notes:'Private historical note',
 ...overrides
});
const empty={shotCount:0,contributors:0,ratio:null,confirmed:false,confidence:'Early Data'};

test('#455 R075 malformed historical measurements cannot count as Community evidence',()=>{
 const invalid=[
  {doseG:null},{doseG:0},{doseG:-1},{doseG:NaN},{doseG:Infinity},
  {doseG:'18'},{yieldG:null},{yieldG:0},{yieldG:-36},
  {yieldG:NaN},{yieldG:-Infinity},{yieldG:'36'},
  {doseG:Number.MIN_VALUE,yieldG:36}
 ];
 for(const override of invalid){
  const input=[shot('bad',override)],original=structuredClone(input);
  assert.deepEqual(communitySummary(input),empty,'Invalid '+Object.keys(override)[0]);
  assert.deepEqual(input,original,'Original shots and notes stay untouched');
 }
});

test('#455 R075 valid five-green measured shots retain balanced ratio and confidence',()=>{
 const input=[shot('one'),shot('two',{yieldG:45})];
 const original=structuredClone(input),summary=communitySummary(input);
 assert.deepEqual(summary,{shotCount:2,contributors:2,ratio:2.25,
  confirmed:true,confidence:'Moderate Confidence'});
 assert.deepEqual(input,original);
});

test('#455 R075 mixed corrupted and sound contributor records cannot distort count, ratio or confidence',()=>{
 const input=[shot('one'),shot('two',{yieldG:45}),
  shot('bad-1',{doseG:0,yieldG:180}),
  shot('bad-2',{doseG:'18',yieldG:180}),
  shot('bad-3',{doseG:18,yieldG:null}),
  shot('bad-4',{yieldG:Infinity})];
 const original=structuredClone(input);
 assert.deepEqual(communitySummary(input),{shotCount:2,contributors:2,ratio:2.25,
  confirmed:true,confidence:'Moderate Confidence'});
 assert.deepEqual(input,original);
});

test('#455 R075 per-contributor weighting and existing outlier guard remain unchanged',()=>{
 const input=[shot('one'),shot('two',{contributorId:'contributor-one',yieldG:54}),
  shot('pending',{outlierReview:'pending'}),
  shot('broken',{contributorId:'contributor-one',doseG:0})];
 const original=structuredClone(input);
 assert.deepEqual(communitySummary(input),{shotCount:2,contributors:1,ratio:2.5,
  confirmed:false,confidence:'Early Data'});
 assert.deepEqual(input,original);
});

test('#455 R075 incomplete/nonideal five-taste history remains ineligible despite valid ratios',()=>{
 const input=[shot('missing',{tasteScales:{...green,clarity:null}}),
  shot('nonideal',{tasteScales:{...green,sweetness:4}}),
  shot('typed',{tasteScales:{...green,body:'3'}}),
  shot('valid')],original=structuredClone(input);
 assert.deepEqual(communitySummary(input),{shotCount:1,contributors:1,ratio:2,
  confirmed:false,confidence:'Early Data'});
 assert.deepEqual(input,original);
});
