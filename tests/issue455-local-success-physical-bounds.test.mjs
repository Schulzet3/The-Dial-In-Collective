import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {hasLocalSuccess} from '../site/lib/model.js';
import {shotCard} from '../site/cloud/shot_card.js';

// R455-119: synthetic archived local/import records only; no member/provider writes.
// The original History can still show its five recorded greens, but the Coffee
// overview must not claim a measured successful recipe from impossible readings.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(patch={})=>({
 id:'legacy',coffeeId:'coffee',setupVersionId:'version',style:'Turbo',
 hidden:false,dialedIn:true,tasteScales:{...green},doseG:18,yieldG:36,timeS:17,
 grindSetting:1.5,notes:'Original private tasting notes',timestamp:'2026-11-08T12:00:00Z',
 ...patch
});
const state=shots=>({activeSetupId:'setup',setups:[
 {id:'setup',activeVersionId:'version',versions:[{id:'version'}]}],shots});

test('R119 malformed imported measurements never mark a Coffee overview as Dialed In',()=>{
 const invalid=[
  {doseG:4.9},{doseG:40.1},{doseG:null},{doseG:'18'},{doseG:Infinity},
  {yieldG:4.9},{yieldG:200.1},{yieldG:null},{yieldG:'36'},{yieldG:NaN},
  {timeS:.9},{timeS:180.1},{timeS:null},{timeS:'17'},{timeS:-Infinity}
 ];
 for(const patch of invalid){
  const archived=shot(patch),s=state([archived]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee','Turbo'),false,JSON.stringify(patch));
  assert.match(shotCard(archived,{expanded:true,activeVersionId:'version'}),/Dialed In/,
   'Original five green ratings stay visible in private History');
  assert.deepEqual(s,before,'Never mutate invalid measurements, ratings, notes or private history');
 }
});

test('R119 inclusive physical boundaries and valid personal successes remain eligible',()=>{
 for(const patch of [
  {doseG:5,yieldG:5,timeS:1},{doseG:40,yieldG:200,timeS:180},
  {doseG:18,yieldG:36,timeS:17}
 ]){
  const s=state([shot(patch)]),before=structuredClone(s);
  assert.equal(hasLocalSuccess(s,'coffee','Turbo'),true);
  assert.equal(hasLocalSuccess(s,'coffee','Traditional'),false,
   'Independent espresso styles must remain separate');
  assert.deepEqual(s,before);
 }
});

test('R119 stale flags, incomplete ratings and unrelated records still cannot certify success',()=>{
 const unrelated=state([
  shot({id:'hidden',hidden:true}),shot({id:'other-coffee',coffeeId:'different'}),
  shot({id:'old-version',setupVersionId:'older'}),
  shot({id:'other-style',style:'Fast-Flow'}),
  shot({id:'missing-rating',tasteScales:{...green,sweetness:null}}),
  shot({id:'flag-only',dialedIn:'true'})
 ]);
 assert.equal(hasLocalSuccess(unrelated,'coffee','Turbo'),false);
 unrelated.shots.push(shot({id:'valid'}));
 assert.equal(hasLocalSuccess(unrelated,'coffee','Turbo'),true);
});

test('R119 the live Coffee overview uses the measured-success guard for status and feedback',()=>{
 const htmlSource=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(htmlSource,/const success=M\.hasLocalSuccess\(s,c\.id,p\.style\)/);
 assert.match(htmlSource,/success\?'Your Dialed In Window':'Starting Recommendation'/);
 assert.match(htmlSource,/last&&\(!success\|\|this\.justSavedId===last\.id\)/);
});
