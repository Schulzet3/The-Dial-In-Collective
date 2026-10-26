import test from 'node:test';
import assert from 'node:assert/strict';
import {STYLES,STYLE_COPY,RATIOS} from '../site/lib/constants.js';
import {baseline,recommendation} from '../site/lib/engine.js';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {styleBadge,select} from '../site/lib/ui.js';
const setup=()=>{const s=hydrate(rawFixture());return {s,c:s.coffees[0]};};
const shot=(id,coffeeId,style,extra={})=>({
 id,coffeeId,style,setupId:'setup',setupVersionId:'version',basketId:'basketv',
 calibrationId:'cal',feedMode:'standard',dialedIn:true,hidden:false,
 doseG:18,yieldG:48,timeS:15,grindSetting:1.5,tempC:90,
 timestamp:'2026-10-22T00:00:00Z',familyId:null,...extra
});
test('Fast-Flow is the sixth explicit option; old priors remain intact',()=>{
 assert.deepEqual(STYLES,['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']);
 assert.match(STYLE_COPY['Fast-Flow'],/SEY-inspired/);
 for(const style of STYLES)assert.ok(styleBadge(style).includes(style));
 assert.match(select('Style','style',STYLES,'Fast-Flow'),/value="Fast-Flow" selected/);
 const base=baseline({roastLevel:'Light'},'Fast-Flow',18);
 assert.equal(base.ratio.center,2.35);assert.equal(base.time.center,13);
 assert.equal(RATIOS.Turbo[2],3);
});
test('incompatible, hidden and unsuccessful Turbo evidence is excluded',()=>{
 const negatives=[{hidden:true},{dialedIn:false},{basketId:'wrong'},{setupVersionId:'wrong'},
  {feedMode:'slow'},{timeS:25},{yieldG:80},{doseG:12,yieldG:50}];
 for(const change of negatives){
  const {s,c}=setup();s.shots.push(shot('turbo',c.id,'Turbo',change));
  const rec=recommendation(s,c.id,{style:'Fast-Flow',ignoreAdvice:true});
  assert.equal(rec.turboFallback,undefined,JSON.stringify(change));
  assert.equal(rec.observations,0);assert.equal(rec.established,false);
 }
});
test('compatible Turbo fallback adjusts only the unproven Fast-Flow ratio',()=>{
 const {s,c}=setup(),before=recommendation(s,c.id,{style:'Fast-Flow',ignoreAdvice:true});
 s.shots.push(shot('turbo',c.id,'Turbo',{yieldG:40,timeS:13,grindSetting:4,tempC:94}));
 const after=recommendation(s,c.id,{style:'Fast-Flow',ignoreAdvice:true});
 assert.equal(after.turboFallback?.style,'Turbo');
 assert.equal(after.turboFallback?.ratioOnly,true);
 assert.equal(after.observations,0);assert.equal(after.familyId,null);
 assert.equal(after.established,false);
 assert.notEqual(after.ratio.center,before.ratio.center);
 assert.deepEqual(after.time,before.time);
 assert.equal(after.tempC,before.tempC);
 assert.equal(after.grind.value,before.grind.value);
 assert.match(after.reasons[0],/Cautious ratio-only/);
});
test('proven Fast-Flow family wins; Turbo does not get relabeled',()=>{
 const {s,c}=setup();s.shots.push(shot('turbo',c.id,'Turbo',{yieldG:38}));
 s.families.push({id:'flow-family',coffeeId:c.id,style:'Fast-Flow'});
 s.shots.push(shot('flow',c.id,'Fast-Flow',{familyId:'flow-family',yieldG:45,timeS:12,grindSetting:1.8}));
 const rec=recommendation(s,c.id,{style:'Fast-Flow'});
 assert.equal(rec.familyId,'flow-family');assert.equal(rec.established,true);
 assert.equal(rec.time.center,12);assert.equal(rec.turboFallback,undefined);
 assert.equal(rec.grind.value,1.8);
 assert.equal(s.shots[0].style,'Turbo');assert.equal(s.shots[1].style,'Fast-Flow');
});
test('other coffees do not leak into direct Turbo fallback',()=>{
 const {s,c}=setup();s.shots.push(shot('turbo','different-coffee','Turbo',{yieldG:40}));
 const rec=recommendation(s,c.id,{style:'Fast-Flow',ignoreAdvice:true});
 assert.equal(rec.turboFallback,undefined);assert.equal(rec.observations,0);
});
test('compatible Fast-Flow evidence on similar coffees outranks same-coffee Turbo fallback',()=>{
 const {s,c}=setup();
 c.roastLevel='Light'; // An unknown roast cannot establish similar-coffee evidence.
 s.coffees.push({...c,id:'similar-coffee',name:'Comparable coffee'});
 s.shots.push(shot('turbo',c.id,'Turbo',{yieldG:40,timeS:13}));
 s.shots.push(shot('flow-other','similar-coffee','Fast-Flow',{yieldG:42,timeS:13}));
 const rec=recommendation(s,c.id,{style:'Fast-Flow',ignoreAdvice:true});
 const alone=structuredClone(s);
 alone.shots=alone.shots.filter(sh=>sh.style!=='Turbo');
 const independent=recommendation(alone,c.id,{style:'Fast-Flow',ignoreAdvice:true});
 assert.equal(rec.source,'Your successful similar coffees on this setup');
 assert.equal(rec.turboFallback,undefined);
 assert.equal(rec.ratio.center,independent.ratio.center,'same-style Fast-Flow evidence must not be nudged by Turbo after selection');
 assert.equal(rec.observations,1);
 assert.equal(rec.established,false);
});
