import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createSetup,activeVersion} from '../site/lib/model.js';
import {grindGuidance} from '../site/lib/engine.js';

const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function guidance(grinds,{otherBasket=false,feed='standard',style='Traditional',missing=false}={}) {
 const s=blankState();
 createSetup(s,{name:'Synthetic grinder setup',basketDoseG:18,grinderMin:.15,grinderMax:2.55,grinder:'Test grinder',burrs:'Test burrs'});
 const v=activeVersion(s),basket=v.baskets[0],coffee={id:'test-coffee',roastLevel:'Medium'};
 s.coffees.push(coffee);
 for(const setting of grinds)s.shots.push({
  id:'shot-'+s.shots.length,coffeeId:coffee.id,setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:otherBasket?'other-basket':basket.id,
  style,feedMode:feed,grindSetting:setting,doseG:18,yieldG:36,timeS:27,
  tempC:null,hidden:false,dialedIn:true,
  tasteScales:missing?{...green,sweetness:null}:{...green},
  notes:'Private original measured note',
  snapshot:{grinderMin:.15,grinderMax:2.55,grinder:'Test grinder',burrs:'Test burrs'}
 });
 const original=structuredClone(s);
 const result=grindGuidance(s,coffee,'Traditional',basket,'standard');
 assert.deepEqual(s,original,'no original shot, note, five ratings or calibration changed');
 return result;
}
test('R419 fractional successful original is not falsely claimed as measured rounded setting',()=>{
 const r=guidance([.15]);
 assert.equal(r.value,.2);
 assert.equal(r.proven,false);
 assert.match(r.source,/Estimated.*successful shots.*rounded/i);
});
test('R419 two observed successes cannot establish an unobserved midpoint',()=>{
 const r=guidance([.2,.4]);
 assert.equal(r.value,.3);
 assert.equal(r.proven,false);
 assert.match(r.source,/Estimated/i);
});
test('R419 exact successful displayed setting remains proven and source-exact',()=>{
 const r=guidance([.2]);
 assert.deepEqual(r,{value:.2,source:'Your successful setting',proven:true});
});
test('R419 median that rounds to actually observed success may remain proven',()=>{
 const r=guidance([.2,.3]);
 assert.equal(r.value,.3);
 assert.equal(r.source,'Your successful setting');
 assert.equal(r.proven,true);
});
test('R419 cross-basket successful setting is still an unproven reference',()=>{
 const r=guidance([.2],{otherBasket:true});
 assert.equal(r.proven,false);
 assert.match(r.source,/other basket/i);
});
test('R419 slow-feed measurement is not borrowed as proven standard-feed guidance',()=>{
 const r=guidance([.2],{feed:'slow'});
 assert.equal(r.proven,false);
 assert.match(r.source,/starting estimate/i);
});
test('R419 success missing a fifth rating cannot establish proven grinder guidance',()=>{
 const r=guidance([.2],{missing:true});
 assert.equal(r.proven,false);
 assert.match(r.source,/starting estimate/i);
});
test('R419 different espresso style cannot establish proven current-style dial',()=>{
 const r=guidance([.2],{style:'Turbo'});
 assert.equal(r.proven,false);
 assert.match(r.source,/starting estimate/i);
});
