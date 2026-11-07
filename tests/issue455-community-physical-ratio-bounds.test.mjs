import test from 'node:test';
import assert from 'node:assert/strict';
import {communitySummary} from '../site/lib/engine.js';

// Synthetic local aggregation only; no Community/SQL/Auth/member/provider writes.
// Archived originals, all five ratings and private notes remain unmodified.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(id,extra={})=>({
 id,contributorId:'member-'+id,dialedIn:true,outlierReview:'not_needed',
 doseG:18,yieldG:36,tasteScales:{...green},notes:'Original private note',
 ...extra
});
const empty={shotCount:0,contributors:0,ratio:null,confirmed:false,confidence:'Early Data'};

test('R092 out-of-approved-dose-or-yield bounds archive cannot seed a Community ratio',()=>{
 for(const bad of [{doseG:4},{doseG:41},{yieldG:4},{yieldG:201},
  {doseG:0},{doseG:Infinity},{doseG:'18'},{yieldG:'36'},
  {yieldG:null},{yieldG:NaN}]){
  const history=[shot('bad',bad)],before=structuredClone(history);
  assert.deepEqual(communitySummary(history),empty,JSON.stringify(bad));
  assert.deepEqual(history,before,'Original shot, notes and ratings preserved');
 }
});

test('R092 existing inclusive physical endpoints remain eligible',()=>{
 const history=[shot('lower',{doseG:5,yieldG:5}),
  shot('upper',{doseG:40,yieldG:200})];
 const before=structuredClone(history);
 assert.deepEqual(communitySummary(history),{
  shotCount:2,contributors:2,ratio:3,confirmed:true,confidence:'Moderate Confidence'
 });
 assert.deepEqual(history,before);
});

test('R092 corrupted extra contributor cannot distort ratio, quorum or confidence',()=>{
 const history=[shot('one'),shot('two',{yieldG:45}),
  shot('bad-one',{doseG:4,yieldG:180}),
  shot('bad-two',{doseG:41,yieldG:45}),
  shot('bad-three',{doseG:18,yieldG:201}),
  shot('bad-four',{doseG:18,yieldG:4})];
 const before=structuredClone(history);
 assert.deepEqual(communitySummary(history),{
  shotCount:2,contributors:2,ratio:2.25,confirmed:true,confidence:'Moderate Confidence'
 });
 assert.deepEqual(history,before);
});

test('R092 valid contributor-balanced two-shot history is unchanged',()=>{
 const history=[shot('first'),shot('second',{contributorId:'member-first',yieldG:54})];
 assert.deepEqual(communitySummary(history),{
  shotCount:2,contributors:1,ratio:2.5,confirmed:false,confidence:'Early Data'
 });
});

test('R092 pending outlier review or incomplete five-green taste is still ineligible',()=>{
 const history=[shot('pending',{outlierReview:'pending'}),
  shot('missing',{tasteScales:{...green,clarity:null}}),
  shot('stale',{dialedIn:true,tasteScales:{...green,body:4}}),
  shot('sound')];
 assert.deepEqual(communitySummary(history),{
  shotCount:1,contributors:1,ratio:2,confirmed:false,confidence:'Early Data'
 });
});

test('R092 ratio-only legacy Community helper records remain accepted without time',()=>{
 const history=[shot('one',{timeS:undefined}),shot('two',{timeS:null})];
 assert.deepEqual(communitySummary(history),{
  shotCount:2,contributors:2,ratio:2,confirmed:true,confidence:'Moderate Confidence'
 });
});

test('R092 bounded archival rejection does not mutate private History on repeated reads',()=>{
 const history=[shot('a'),shot('corrupt',{yieldG:230,notes:'Do not alter original'})];
 const before=structuredClone(history);
 const wanted={shotCount:1,contributors:1,ratio:2,confirmed:false,confidence:'Early Data'};
 assert.deepEqual(communitySummary(history),wanted);
 assert.deepEqual(communitySummary(history),wanted);
 assert.deepEqual(history,before);
});
