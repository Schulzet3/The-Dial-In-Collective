import test from 'node:test';
import assert from 'node:assert/strict';
import {lastRecipeContextShot} from '../site/lib/ui.js';
import {CONFIG} from '../site/lib/constants.js';

// R455-105 synthetic historical rows. No production or member operations.
const recipe={style:'Turbo',basketId:'basket',feedMode:'slow'};
const version={id:'v2',calibrationId:'cal2',grinderMin:0,grinderMax:10};
const tastes={extraction:2,body:3,clarity:4,sweetness:4,astringency:1};
const sample=(id,timestamp,patch={})=>({
 id,timestamp,coffeeId:'coffee-a',setupVersionId:'v2',calibrationId:'cal2',
 basketId:'basket',style:'Turbo',feedMode:'slow',hidden:false,
 doseG:18,yieldG:36,timeS:16,grindSetting:5.5,tempC:93,
 tasteScales:{...tastes},dialedIn:false,
 notes:'Original private archived note',...patch
});
const select=shots=>lastRecipeContextShot(shots,'coffee-a',recipe,version);

test('R105 invalid newest imported measurements cannot replace older valid recipe feedback',()=>{
 const old=sample('valid','2026-11-06T10:00:00Z');
 const invalid=[
  {doseG:4.9},{doseG:40.1},{doseG:'18'},{doseG:null},{doseG:Infinity},
  {yieldG:4.9},{yieldG:200.1},{yieldG:'36'},{yieldG:NaN},
  {timeS:0},{timeS:180.1},{timeS:'16'},
  {grindSetting:-.1},{grindSetting:10.1},{grindSetting:null},
  {tempC:69.9},{tempC:100.1},{tempC:'93'}
 ];
 for(const patch of invalid){
  const bad=sample('archived','2026-11-07T10:00:00Z',patch);
  const shots=[bad,old],before=structuredClone(shots);
  assert.equal(select(shots)?.id,'valid',JSON.stringify(patch));
  assert.equal(select([bad]),null);
  assert.deepEqual(shots,before,'original history, five ratings and private notes remain unchanged');
 }
});

test('R105 inclusive Log Shot physical/espresso bounds and optional temperature remain eligible',()=>{
 const low=sample('lower','2026-11-07T10:00:00Z',{
  doseG:CONFIG.bounds.doseG[0],yieldG:CONFIG.bounds.yieldG[0],
  timeS:CONFIG.bounds.timeS[0],grindSetting:0,tempC:CONFIG.bounds.tempC[0]});
 const high=sample('upper','2026-11-07T11:00:00Z',{
  doseG:CONFIG.bounds.doseG[1],yieldG:CONFIG.bounds.yieldG[1],
  timeS:CONFIG.bounds.timeS[1],grindSetting:10,tempC:CONFIG.bounds.tempC[1]});
 assert.equal(select([low])?.id,'lower');
 assert.equal(select([low,high])?.id,'upper');
 assert.equal(select([sample('without-temp','2026-11-08T10:00:00Z',{tempC:null})])?.id,'without-temp');
});

test('R105 context, dates and hidden history stay isolated',()=>{
 const old=sample('context','2026-11-06T10:00:00Z');
 for(const patch of [
  {style:'Fast-Flow'},{feedMode:'standard'},{basketId:'other'},
  {calibrationId:'old'},{coffeeId:'foreign'},{setupVersionId:'old'},
  {hidden:true},{timestamp:''},{timestamp:'unparseable'}
 ]){
  const newer=sample('wrong','2026-11-07T10:00:00Z',patch);
  assert.equal(select([newer,old])?.id,'context',JSON.stringify(patch));
 }
});
