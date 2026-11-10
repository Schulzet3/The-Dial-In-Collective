import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// R455-141 synthetic local-only source regressions; never use member/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const partial={...green,extraction:2};
const shot=(id,extra={})=>({
 id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
 basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
 doseG:20,yieldG:50,timeS:22,grindSetting:1.2,tempC:91,
 timestamp:'2026-11-07T12:00:00Z',dialedIn:false,tasteScales:{...partial},
 notes:'Original private taste notes',suggestion:{
  title:'Try yield',text:'Previous measured taste feedback',
  next:{grindSetting:1.2,yieldCenter:55}
 },...extra
});
function setup(successPatch={}){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 v.advanced.temperature=true;
 v.baskets.push({id:'different-basket',name:'Other active basket',doseG:20,archived:false});
 s.families.push({id:'successful-family',coffeeId:'coffee',style:'Turbo'});
 s.shots.push(shot('prior-success',{
  timestamp:'2026-11-06T12:00:00Z',dialedIn:true,tasteScales:{...green},
  familyId:'successful-family',...successPatch
 }));
 s.shots.push(shot('latest-feedback'));
 return s;
}
const current=s=>recommendation(s,'coffee',{
 style:'Turbo',basketId:'basketv',feedMode:'standard'
});

test('R141 successful other basket, feed, or calibration cannot veto current rated feedback',()=>{
 for(const patch of [
  {basketId:'different-basket'},
  {feedMode:'slow'},
  {calibrationId:'other-calibration'}
 ]){
  const s=setup(patch),before=structuredClone(s),rec=current(s);
  assert.equal(rec.source,'Adjustment from your latest taste rating',JSON.stringify(patch));
  assert.equal(rec.doseG,20);
  assert.equal(rec.yield.center,55);
  assert.equal(rec.grind.value,1.2);
  assert.equal(rec.tempC,91);
  assert.deepEqual(s,before,'all green histories and original private notes remain intact');
 }
});

test('R141 green success for the same basket, feed and calibration keeps established-recipe precedence',()=>{
 const s=setup(),before=structuredClone(s),rec=current(s);
 assert.notEqual(rec.source,'Adjustment from your latest taste rating');
 assert.equal(s.shots[0].dialedIn,true);
 assert.deepEqual(s.shots[0].tasteScales,green);
 assert.deepEqual(s,before);
});

test('R141 a missing rating, hidden success or physically invalid green source never vetoes feedback',()=>{
 for(const patch of [
  {tasteScales:{...green,sweetness:null}},
  {hidden:true},
  {timeS:181}
 ]){
  const s=setup(patch),before=structuredClone(s),rec=current(s);
  assert.equal(rec.source,'Adjustment from your latest taste rating',JSON.stringify(patch));
  assert.deepEqual(s,before);
 }
});
