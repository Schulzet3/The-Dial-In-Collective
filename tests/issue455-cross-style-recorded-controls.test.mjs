import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,selectedBasket} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';

// Issue #455 R172: synthetic owned-state source regression, no real account.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(){
 const s=hydrate(rawFixture()),version=activeVersion(s);
 const coffee=s.coffees.find(c=>c.id==='coffee');
 coffee.roastLevel='Light';coffee.roasterRecipe=null;
 s.shots=[];s.families=[];s.communityEvidence={};s.preferences='';
 const basket=selectedBasket(s,coffee.id);
 const shot=(patch={})=>({
  id:'cross-style',coffeeId:coffee.id,setupVersionId:version.id,
  calibrationId:version.calibrationId,basketId:basket.id,style:'Turbo',
  feedMode:'standard',hidden:false,dialedIn:true,tasteScales:{...green},
  doseG:18,yieldG:45,timeS:15,
  grindSetting:(version.grinderMin+version.grinderMax)/2,tempC:92,
  timestamp:'2026-11-10T12:00:00Z',notes:'Do not mutate private raw history',
  snapshot:{grinderMin:version.grinderMin,grinderMax:version.grinderMax},
  ...patch
 });
 const rec=style=>recommendation(s,coffee.id,{
  style,basketId:basket.id,feedMode:'standard',ignoreAdvice:true
 });
 return {s,version,coffee,basket,shot,rec};
}
test('R172 corrupted explicit cross-style grinder or temperature cannot bias Traditional ratio',()=>{
 const {rec}=fixture(),baseline=rec('Traditional');
 for(const patch of [{grindSetting:-1},{grindSetting:Infinity},
  {grindSetting:'5'},{tempC:101},{tempC:NaN},{tempC:'92'}]){
  const f=fixture();f.s.shots.push(f.shot(patch));
  const before=structuredClone(f.s),observed=f.rec('Traditional');
  assert.equal(observed.source,baseline.source,JSON.stringify(patch));
  assert.equal(observed.ratio.center,baseline.ratio.center,JSON.stringify(patch));
  assert.doesNotMatch(observed.reasons.join(' '),/other styles/i);
  assert.deepEqual(f.s,before,'History, notes and all five tastes unchanged');
 }
});
test('R172 invalid other-style greens cannot veto a valid same-style similar-coffee donor',()=>{
 const f=fixture(),other={...structuredClone(f.coffee),id:'other-coffee',name:'Other Light'};
 f.s.coffees.push(other);
 f.s.shots.push(f.shot({id:'donor',coffeeId:'other-coffee',style:'Traditional',yieldG:40}),
  f.shot({id:'invalid-turbo',grindSetting:f.version.grinderMax+1}));
 const before=structuredClone(f.s),r=f.rec('Traditional');
 assert.equal(r.source,'Your successful similar coffees on this setup');
 assert.equal(r.observations,1);
 assert.deepEqual(f.s,before);
});
test('R172 Turbo cannot shift independent Fast-Flow starting ratio with invalid explicit controls',()=>{
 const base=fixture().rec('Fast-Flow');
 for(const patch of [{grindSetting:-.1},{grindSetting:Infinity},
  {tempC:69},{tempC:'92'}]){
  const f=fixture();f.s.shots.push(f.shot(patch));
  const r=f.rec('Fast-Flow');
  assert.equal(r.turboFallback,undefined);
  assert.equal(r.ratio.center,base.ratio.center);
 }
});
test('R172 valid inclusive or missing optional controls retain weak cross-style hints',()=>{
 const {version}=fixture();
 for(const patch of [{grindSetting:version.grinderMin,tempC:70},
  {grindSetting:version.grinderMax,tempC:100},
  {grindSetting:null,tempC:null}]){
  const f=fixture();f.s.shots.push(f.shot(patch));
  const before=structuredClone(f.s);
  const traditional=f.rec('Traditional'),fast=f.rec('Fast-Flow');
  assert.match(traditional.reasons.join(' '),/other styles/i);
  assert.equal(fast.turboFallback?.style,'Turbo');
  assert.equal(fast.turboFallback?.ratioOnly,true);
  assert.deepEqual(f.s,before);
 }
});
test('R172 older-version cross-style controls use their recorded espresso range',()=>{
 const invalid=fixture(),base=invalid.rec('Traditional');
 invalid.s.shots.push(invalid.shot({setupVersionId:'older',
  grindSetting:5,snapshot:{grinderMin:0,grinderMax:4}}));
 assert.equal(invalid.rec('Traditional').ratio.center,base.ratio.center);
 const valid=fixture();valid.s.shots.push(valid.shot({setupVersionId:'older',
  grindSetting:4,snapshot:{grinderMin:0,grinderMax:4}}));
 assert.match(valid.rec('Traditional').reasons.join(' '),/other styles/i);
});
test('R172 keep all-five taste and measured entry gates across styles',()=>{
 for(const patch of [{tasteScales:{...green,sweetness:null}},
  {hidden:true},{yieldG:201},{doseG:4},{timeS:181},{dialedIn:false}]){
  const f=fixture(),baseline=f.rec('Traditional');
  f.s.shots.push(f.shot(patch));
  assert.equal(f.rec('Traditional').ratio.center,baseline.ratio.center);
  assert.doesNotMatch(f.rec('Traditional').reasons.join(' '),/other styles/i);
 }
});
