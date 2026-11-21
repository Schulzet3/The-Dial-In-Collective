import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankState,createSetup,activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {recipeGrid} from '../site/lib/ui.js';

// Synthetic only; never read member or production/provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function scenario({min=.15,max=2.55,setting=2.55,withShot=true,
 otherBasket=false,missing=false,style='Traditional',feed='standard'}={}){
 const s=blankState();
 createSetup(s,{name:'Synthetic grinder',basketDoseG:18,grinderMin:min,grinderMax:max,
  grinder:'Synthetic grinder',burrs:'Synthetic burrs'});
 const v=activeVersion(s),basket=v.baskets[0];
 const coffee={id:'synthetic-coffee',name:'Synthetic coffee',roastLevel:'Medium'};
 s.coffees.push(coffee);
 if(withShot)s.shots.push({
  id:'synthetic-shot',coffeeId:coffee.id,setupId:s.activeSetupId,setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:otherBasket?'other-basket':basket.id,
  style,feedMode:feed,grindSetting:setting,doseG:18,yieldG:36,timeS:27,
  timestamp:'2026-11-19T16:00:00.000Z',tempC:null,hidden:false,dialedIn:true,
  tasteScales:missing?{...green,sweetness:null}:{...green},
  notes:'Original measured private note',
  snapshot:{grinderMin:min,grinderMax:max,grinder:v.grinder,burrs:v.burrs}
 });
 const before=structuredClone(s);
 const rec=recommendation(s,coffee.id,{style,basketId:basket.id,feedMode:feed});
 assert.deepEqual(s,before,'engine must not alter original shots, all five tastes, notes or calibration');
 return {rec,s};
}
function gridInside(rec,min,max){
 assert.ok(Number.isFinite(rec.grind.value),'a selectable recommendation must be finite');
 assert.ok(rec.grind.value>=min-1e-8&&rec.grind.value<=max+1e-8);
 assert.ok(Math.abs(rec.grind.value*10-Math.round(rec.grind.value*10))<1e-8,'point is selectable tenth');
 if(rec.grind.range)for(const end of ['low','high']){
  const g=rec.grind.range[end];
  assert.ok(g>=min-1e-8&&g<=max+1e-8,'band inside actual espresso range');
  assert.ok(Math.abs(g*10-Math.round(g*10))<1e-8,'band endpoint is selectable tenth');
 }
}
test('R421 fractional upper bound: five-green 2.55 remains measured, suggested point/band selectable',()=>{
 const {rec,s}=scenario();
 assert.equal(s.shots[0].grindSetting,2.55);
 assert.equal(s.shots[0].notes,'Original measured private note');
 assert.deepEqual(s.shots[0].tasteScales,green);
 gridInside(rec,.15,2.55);
 assert.equal(rec.grind.value,2.5);
 assert.equal(rec.grind.proven,false,'projected unmeasured tenth must not be proven');
 assert.doesNotMatch(rec.grind.source,/^Your successful setting$/);
 const html=recipeGrid(rec);assert.ok(html.includes('2.5'));
 assert.ok(!html.includes('2.6'),'UI must not display invalid fractional-endpoint band');
});
test('R421 other-basket five-green reference stays unproven and in range',()=>{
 const {rec}=scenario({otherBasket:true});
 gridInside(rec,.15,2.55);assert.equal(rec.grind.proven,false);
});
test('R421 fractional lower bound projects 0.15 only to legal tenth 0.2',()=>{
 const {rec,s}=scenario({setting:.15});
 gridInside(rec,.15,2.55);assert.equal(rec.grind.value,.2);
 assert.equal(rec.grind.proven,false);assert.equal(s.shots[0].grindSetting,.15);
});
test('R421 exact actually observed 2.5 stays proven without fabricated range',()=>{
 const {rec}=scenario({setting:2.5});
 gridInside(rec,.15,2.55);assert.equal(rec.grind.value,2.5);
 assert.equal(rec.grind.proven,true);
 assert.equal(rec.grind.source,'Your successful setting');
});
test('R421 one legal tenth in narrow fractional range never escapes endpoints',()=>{
 const {rec}=scenario({min:.15,max:.25,setting:.15});
 gridInside(rec,.15,.25);assert.equal(rec.grind.value,.2);
 if(rec.grind.range)assert.deepEqual(rec.grind.range,{low:.2,high:.2});
});
test('R421 no legal tenth returns honest abstention, not a zero or out-of-range suggestion',()=>{
 for(const withShot of [false,true]){
  const {rec,s}=scenario({min:.151,max:.159,setting:.155,withShot});
  assert.equal(rec.grind.value,null);
  assert.equal(rec.grind.copyable,false);
  assert.match(rec.grind.source,/No tenth-step setting fits/i);
  assert.ok(!rec.grind.range);
  const html=recipeGrid(rec);
  assert.match(html,/No tenth-step setting fits/i);
  if(withShot)assert.equal(s.shots[0].grindSetting,.155);
 }
});
test('R421 missing fifth taste cannot establish measured grind success',()=>{
 const {rec}=scenario({setting:2.55,missing:true});
 gridInside(rec,.15,2.55);
 assert.equal(rec.grind.proven,false);
});
test('R421 style/feed contexts retain independently bounded starting references',()=>{
 for(const style of ['Turbo','Fast-Flow','Traditional']){
  const {rec}=scenario({style,feed:'slow',withShot:false});
  gridInside(rec,.15,2.55);
  assert.equal(rec.grind.proven,false);
 }
});
test('R421 Log Shot disables unavailable copy and guards stale click without logging usage',()=>{
 const source=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(source,/disabled title="No selectable grinder recommendation"/);
 assert.match(source,/r\?\.grind\?\.copyable===false\|\|!Number\.isFinite\(r\?\.grind\?\.value\)/);
 assert.match(source,/No selectable tenth-step grind recommendation fits this setup/);
});
