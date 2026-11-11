import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {saveShot,recommendation} from '../site/lib/engine.js';

// R176 synthetic archival dates only. No member, SQL, provider or network access.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const sour={...green,extraction:2};
function scenario(){
 const s=hydrate(rawFixture());s.shots=[];s.families=[];s.communityEvidence={};
 const latest=saveShot(s,'coffee',{
  id:'latest-rated',basketId:'basketv',style:'Turbo',feedMode:'standard',
  doseG:18,yieldG:44,timeS:16,grindSetting:2,tempC:null,
  tasteScales:{...sour},notes:'Original private rated shot note'
 });
 const rec=()=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
 const archived=(patch={})=>{
  const row={...structuredClone(latest),id:'archived-green',timestamp:'bad-date',
   tasteScales:{...green},dialedIn:true,suggestion:null,
   notes:'Original private archived note',...patch};
  s.shots.push(row);return row;
 };
 return {s,latest,rec,archived};
}
test('R176 malformed date on imported green cannot veto newest sour feedback',()=>{
 const f=scenario(),arch=f.archived();
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,49,'reuse existing 5 g yield change, not a new target');
 assert.equal(r.grind.value,2);
 assert.equal(r.doseG,18);
 assert.equal(arch.notes,'Original private archived note');
 assert.deepEqual(f.s,before,'History, notes and all five original scales remain immutable');
});
test('R176 absent, null, nonstring, blank and malformed archived dates cannot veto',()=>{
 for(const stamp of [undefined,null,'','   ',42,{},'2026-not-a-date']){
  const f=scenario();f.archived({timestamp:stamp});
  const before=structuredClone(f.s),r=f.rec();
  assert.equal(r.source,'Adjustment from your latest taste rating',String(stamp));
  assert.equal(r.yield.center,49);
  assert.deepEqual(f.s,before);
 }
});
test('R176 valid timestamped five-green archived success retains prior veto behavior',()=>{
 const f=scenario();
 f.archived({timestamp:new Date(Date.parse(f.latest.timestamp)-60000).toISOString()});
 const before=structuredClone(f.s),r=f.rec();
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
test('R176 incomplete archived green scores never qualify as success evidence',()=>{
 const f=scenario();f.archived({timestamp:'bad-date',tasteScales:{...green,sweetness:null},dialedIn:true});
 const before=structuredClone(f.s),r=f.rec();
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,49);
 assert.deepEqual(f.s,before);
});
test('R176 latest all-green shot still is success rather than a manufactured adjustment',()=>{
 const f=scenario();f.latest.tasteScales={...green};f.latest.dialedIn=true;
 const before=structuredClone(f.s),r=f.rec();
 assert.notEqual(r.source,'Adjustment from your latest taste rating');
 assert.deepEqual(f.s,before);
});
