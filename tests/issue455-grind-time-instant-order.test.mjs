import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,learnSensitivity} from '../site/lib/engine.js';

test('#455 previous-calibration estimate honors real instants and excludes invalid legacy dates',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],c=s.coffees[0],basket=v.baskets[0];
 const old={coffeeId:c.id,setupVersionId:v.id,calibrationId:'prior-scale',
  basketId:basket.id,style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,
  doseG:18,yieldG:36,timeS:21,tempC:null,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  notes:'Preserve this private archived note',snapshot:{grinderMin:0,grinderMax:5}};
 s.shots=[
  {...old,id:'older',timestamp:'2026-11-05T03:00:00+02:00',grindSetting:1.2},
  {...old,id:'newer',timestamp:'2026-11-04T23:30:00-07:00',grindSetting:2.8},
  {...old,id:'malformed',timestamp:'z-not-a-date',grindSetting:4.0}
 ];
 assert.ok(s.shots[0].timestamp>s.shots[1].timestamp);
 assert.ok(Date.parse(s.shots[0].timestamp)<Date.parse(s.shots[1].timestamp));
 const before=structuredClone(s.shots);
 const guidance=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.equal(guidance.source,'Estimated from previous calibration');
 assert.equal(guidance.value,2.8);
 assert.equal(guidance.proven,false);
 assert.deepEqual(s.shots,before);
});

function readings(){
 const base={coffeeId:'same-coffee',style:'Turbo',setupVersionId:'v1',
  calibrationId:'cal1',basketId:'b1',feedMode:'standard',
  doseG:18,yieldG:36,tempC:93,hidden:false,
  notes:'Private measurements must not be rewritten',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1}};
 return [
  {...base,id:'a',grindSetting:1,timeS:70,timestamp:'2026-11-05T01:00:00+02:00'},
  {...base,id:'b',grindSetting:1.2,timeS:60,timestamp:'2026-11-04T18:00:00-07:00'},
  {...base,id:'c',grindSetting:1.4,timeS:30,timestamp:'2026-11-05T04:00:00+02:00'},
  {...base,id:'d',grindSetting:1.6,timeS:20,timestamp:'2026-11-04T20:00:00-07:00'}
 ];
}

test('#455 same-coffee grind sensitivity uses chronological neighboring instants',()=>{
 const shots=readings(),before=structuredClone(shots),observed=learnSensitivity(shots);
 assert.ok(observed);
 assert.equal(observed.samples,3);
 assert.ok(Math.abs(observed.secondsPerUnit+50)<1e-8,
  'timezone-lexical order would produce -100 instead of -50');
 assert.deepEqual(shots,before);
});

test('#455 invalid historical dates cannot manufacture sensitivity observations',()=>{
 const shots=readings().slice(0,2);
 shots.push({...shots[1],id:'bad',timestamp:'z-not-a-date',grindSetting:1.4,timeS:50});
 const before=structuredClone(shots);
 assert.equal(learnSensitivity(shots),null);
 assert.deepEqual(shots,before);
 shots[2].timestamp='2026-11-05T08:00:00Z';
 assert.equal(learnSensitivity(shots).samples,2,'valid three-shot control');
});
