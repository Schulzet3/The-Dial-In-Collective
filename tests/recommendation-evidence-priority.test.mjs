import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,personalSimilarCoffeeReference,baseline,suggestedStyle} from '../site/lib/engine.js';
import {ROASTS,canonicalRoastLevel,roastIndex,RATIOS,TEMPS} from '../site/lib/constants.js';
import {activeVersion} from '../site/lib/model.js';

const create=()=>{
 const s=hydrate(rawFixture());
 const target=s.coffees[0];
 s.coffees.push({...target,id:'other-coffee',name:'Comparable Light Coffee',process:'Washed'});
 return {s,target};
};
const good=(id,coffeeId,extra={})=>({
 id,coffeeId,setupId:'setup',setupVersionId:'version',style:'Turbo',
 basketId:'basketv',calibrationId:'cal',feedMode:'standard',
 doseG:18,yieldG:39,timeS:27,grindSetting:1.3,
 tempC:null,dialedIn:true,hidden:false,timestamp:'2026-10-08T12:00:00Z',
 familyId:null,...extra
});
test('personal similar coffees improve starting yield/time but stay unproven',()=>{
 const {s,target}=create(),baseline=recommendation(s,target.id);
 s.shots.push(good('green-one','other-coffee'));
 const rec=recommendation(s,target.id);
 assert.ok(rec.ratio.center<baseline.ratio.center);
 assert.ok(rec.time.center>baseline.time.center);
 assert.equal(rec.established,false);
 assert.equal(rec.observations,1);
 assert.match(rec.reasons[0],/1 successful Turbo shot on 1 similar Light coffee/);
 assert.equal(rec.source,'Your successful similar coffees on this setup');
});
test('unsuccessful, hidden, wrong-style or wrong-feed shots never inform similar fallback',()=>{
 const {s,target}=create(),baseline=recommendation(s,target.id);
 s.shots.push(good('bad','other-coffee',{dialedIn:false}),
  good('hidden','other-coffee',{hidden:true}),
  good('style','other-coffee',{style:'Traditional'}),
  good('feed','other-coffee',{feedMode:'slow'}));
 const rec=recommendation(s,target.id);
 assert.equal(rec.ratio.center,baseline.ratio.center);
 assert.equal(rec.time.center,baseline.time.center);
 assert.equal(rec.observations,0);
});
test('unknown roast does not fabricate a personal similar-coffee match',()=>{
 const {s,target}=create();target.roastLevel='';
 s.shots.push(good('other','other-coffee'));
 assert.equal(personalSimilarCoffeeReference(s,target,activeVersion(s),'Turbo','standard','basketv'),null);
});
test('exact successful family always outranks another coffee in the same setup',()=>{
 const {s,target}=create();
 s.shots.push(good('other','other-coffee',{yieldG:25,timeS:40}));
 s.families.push({id:'fam',coffeeId:target.id,style:'Turbo',createdAt:'2026-10-01T12:00:00Z'});
 s.shots.push(good('exact',target.id,{familyId:'fam',yieldG:54,timeS:16}));
 const rec=recommendation(s,target.id);
 assert.equal(rec.established,true);
 assert.equal(rec.observations,1);
 assert.ok(Math.abs(rec.ratio.center-3)<.01);
 assert.equal(rec.time.center,16);
 assert.doesNotMatch(rec.reasons.join(' '),/similar Light coffee|Based on your successful shots/i);
});
test('exact-coffee cross-style success takes priority over similar other coffees',()=>{
 const {s,target}=create();
 s.shots.push(good('exact-trad',target.id,{style:'Traditional',yieldG:32,timeS:27}));
 s.shots.push(good('other','other-coffee',{yieldG:40,timeS:27}));
 const rec=recommendation(s,target.id);
 assert.equal(rec.observations,0);
 assert.doesNotMatch(rec.reasons.join(' '),/similar Light coffee/i);
});

test('unproven personal Grind has a calibrated starting interval',()=>{
 const {s,target}=create();s.shots.push(good('neighbor','other-coffee',{grindSetting:1.3}));
 const rec=recommendation(s,target.id);
 assert.ok(rec.grind.range);
 assert.ok(rec.grind.range.low<=rec.grind.value&&rec.grind.range.high>=rec.grind.value);
 assert.ok(rec.grind.range.high-rec.grind.range.low<=1);
 assert.equal(rec.grind.proven,false);
});
test('pure grinder baseline also has a bounded uncertainty interval',()=>{
 const {s,target}=create();const rec=recommendation(s,target.id);
 assert.ok(rec.grind.range);
 assert.ok(rec.grind.range.low>=0&&rec.grind.range.high<=5);
 assert.match(rec.grind.source,/range starting estimate/);
});
test('a Dialed In grinder result retains a proven precise value',()=>{
 const {s,target}=create();
 s.families.push({id:'own-family',coffeeId:target.id,style:'Turbo'});
 s.shots.push(good('own',target.id,{familyId:'own-family',grindSetting:1.1}));
 const rec=recommendation(s,target.id);
 assert.equal(rec.grind.value,1.1);
 assert.equal(rec.grind.proven,true);
 assert.equal(rec.grind.range,undefined);
});
test('explicit post-taste adjustment remains a single target',()=>{
 const {s,target}=create();const sh=good('under',target.id,{dialedIn:false,grindSetting:1.3,timeS:10});
 sh.suggestion={next:{grindSetting:1.1,yieldCenter:50}};
 s.shots.push(sh);
 const rec=recommendation(s,target.id);
 assert.equal(rec.grind.value,1.1);
 assert.equal(rec.grind.range,undefined);
});

test('fresh unrated-cache shot computes a precise next Grind from taste feedback',()=>{
 const {s,target}=create();
 s.shots.push(good('unsuccessful',target.id,{dialedIn:false,grindSetting:1.2,timeS:10,
  tasteScales:{extraction:2,body:2,clarity:3,sweetness:2,astringency:1},suggestion:null}));
 const rec=recommendation(s,target.id);
 assert.equal(rec.source,'Adjustment from your latest taste rating');
 assert.equal(rec.grind.range,undefined);
 assert.notEqual(rec.grind.value,1.2);
});

test('seven Title Case tiers retain all former five recipe ratios and temperatures',()=>{
 assert.deepEqual(ROASTS,['Ultra Light','Very Light','Light','Medium-Light','Medium','Medium-Dark','Dark']);
 assert.equal(canonicalRoastLevel('Light-Medium'),'Medium-Light');
 const old=[
  ['Light',2.5,3.0,1.5,3.2,95,[25,32]],
  ['Medium-Light',2.35,2.8,1.4,3.0,94,[25,32]],
  ['Medium',2.0,2.6,1.3,2.8,93,[25,32]],
  ['Medium-Dark',1.9,2.4,1.2,2.6,91.5,[22,28]],
  ['Dark',1.8,2.2,1.1,2.5,90,[22,28]]
 ];
 for(const [label,trad,turbo,ristretto,lungo,temp,time] of old){
  const i=roastIndex(label),r=baseline({roastLevel:label},'Traditional',18);
  assert.deepEqual([RATIOS.Traditional[i],RATIOS.Turbo[i],RATIOS.Ristretto[i],RATIOS.Lungo[i],TEMPS[i]],[trad,turbo,ristretto,lungo,temp]);
  assert.equal(r.ratio.center,trad);
  assert.deepEqual([r.time.low,r.time.high],time);
  assert.equal(r.tempC,temp);
 }
 for(const label of ['Ultra Light','Very Light']){
  assert.equal(baseline({roastLevel:label},'Traditional',18).ratio.center,2.5);
  assert.equal(baseline({roastLevel:label},'Traditional',18).tempC,95);
  assert.equal(suggestedStyle({roastLevel:label},'clarity').style,'Turbo');
 }
 assert.equal(baseline({roastLevel:'unknown'},'Traditional',18).ratio.center,2);
});
test('neighboring new light tiers offer only unproven conservative references',()=>{
 const {s,target}=create();
 target.roastLevel='Ultra Light';
 s.coffees.find(c=>c.id==='other-coffee').roastLevel='Very Light';
 const before=recommendation(s,target.id);
 s.shots.push(good('neighbor','other-coffee'));
 const after=recommendation(s,target.id);
 assert.equal(after.established,false);
 assert.equal(after.observations,1);
 assert.match(after.reasons[0],/Cautious starting reference/);
 assert.ok(after.ratio.center<before.ratio.center);
});
