import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation,personalSimilarCoffeeReference} from '../site/lib/engine.js';
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
