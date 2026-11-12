import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCurrent} from '../site/lib/engine.js';
import {shotCard} from '../site/cloud/shot_card.js';

// R455-171: synthetic historical state only; no member/provider writes.
const ideal={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(patch={}){
 const sh={id:'archived',coffeeId:'coffee',setupVersionId:'v1',style:'Turbo',
  familyId:'family',hidden:false,dialedIn:true,tasteScales:{...ideal},
  doseG:18,yieldG:36,timeS:15,grindSetting:5,tempC:92,
  timestamp:'2026-11-10T15:00:00Z',notes:'Original private member-style note',
  snapshot:{grinderMin:0,grinderMax:10},...patch};
 return {activeSetupId:'setup',setups:[{id:'setup',activeVersionId:'v1',
  versions:[{id:'v1',grinderMin:0,grinderMax:10}],
  workspaces:{v1:{coffees:{coffee:{style:'Traditional',currentFamilies:{},favoriteShots:{}}}}}}],
  shots:[sh],families:[{id:'family',coffeeId:'coffee',style:'Turbo'}],audit:[]};
}
const card=(sh,options={})=>shotCard(sh,{expanded:true,activeVersionId:'v1',
 familyRecorded:true,grinderMin:0,grinderMax:10,...options});
function assertRefused(patch,error){
 const s=fixture(patch),before=structuredClone(s);
 assert.match(card(s.shots[0]),/Dialed In/,'History retains genuine original greens');
 assert.match(card(s.shots[0]),/Original private member-style note/);
 assert.doesNotMatch(card(s.shots[0]),/data-action="make-current"/);
 assert.throws(()=>makeCurrent(s,'archived'),error);
 assert.deepEqual(s,before,'Refused favorite leaves all raw measurements, notes and audit unchanged');
}
test('R171 impossible recorded grinder values cannot become a Current recipe',()=>{
 for(const grindSetting of [-.1,10.1,'5',NaN,Infinity,-Infinity])
  assertRefused({grindSetting},/valid recorded grinder setting/);
});
test('R171 explicitly invalid optional temperature cannot become a Current recipe',()=>{
 for(const tempC of [69.9,100.1,'92',NaN,Infinity,-Infinity])
  assertRefused({tempC},/valid recorded temperature/);
});
test('R171 active espresso calibration outweighs a historical wider snapshot',()=>{
 assertRefused({grindSetting:11,snapshot:{grinderMin:0,grinderMax:12}},/valid recorded grinder setting/);
});
test('R171 inclusive valid limits and missing legacy optional readings remain eligible',()=>{
 const patches=[{grindSetting:0,tempC:70},{grindSetting:10,tempC:100},
  {grindSetting:5,tempC:null},{grindSetting:null,tempC:null},
  {grindSetting:undefined,tempC:undefined}];
 for(const patch of patches){
  const s=fixture(patch),before=structuredClone(s.shots);
  assert.match(card(s.shots[0]),/data-action="make-current"/);
  makeCurrent(s,'archived');
  const p=s.setups[0].workspaces.v1.coffees.coffee;
  assert.equal(p.currentFamilies.Turbo,'family');assert.equal(p.favoriteShots.family,'archived');
  assert.equal(p.style,'Turbo');assert.equal(s.audit.length,1);
  assert.deepEqual(s.shots,before,'Manual selection leaves recorded history immutable');
 }
});
test('R171 missing taste, pending sync or other version still hides History choice',()=>{
 for(const patch of [{tasteScales:{...ideal,sweetness:null}},
  {cloudPending:true},{setupVersionId:'older'}]){
  const s=fixture(patch),before=structuredClone(s);
  assert.doesNotMatch(card(s.shots[0]),/data-action="make-current"/);
  if(!patch.cloudPending){assert.throws(()=>makeCurrent(s,'archived'));assert.deepEqual(s,before);}
 }
});
