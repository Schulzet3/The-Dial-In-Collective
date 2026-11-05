import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance} from '../site/lib/engine.js';

test('#455 previous calibration estimates require a dated legacy measurement',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],c=s.coffees[0];
 const basket=v.baskets[0];
 const old={coffeeId:c.id,setupVersionId:v.id,calibrationId:'old-calibration',
  basketId:basket.id,style:'Turbo',feedMode:'standard',hidden:false,dialedIn:true,
  doseG:18,yieldG:36,timeS:21,grindSetting:4,
  notes:'Private archived recipe note',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  snapshot:{grinderMin:0,grinderMax:5}};
 s.shots=[
  {...old,id:'legacy-blank',timestamp:'   '},
  {...old,id:'legacy-nonstring',timestamp:17},
  {...old,id:'legacy-null',timestamp:null}
 ];
 const original=structuredClone(s.shots);
 const noDate=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.equal(noDate.source,'Espresso range starting estimate',
  'undated prior calibration is not a chronologically verified reference');
 assert.equal(noDate.proven,false);
 assert.equal(noDate.value,3.8,'preserve the existing Turbo range starter');
 assert.deepEqual(s.shots,original,'keep historical measurements, five tastes and private notes');

 s.shots.push({...old,id:'old-valid',timestamp:'2026-11-04T11:00:00Z',grindSetting:2.8});
 const dated=grindGuidance(s,c,'Turbo',basket,'standard');
 assert.equal(dated.source,'Estimated from previous calibration');
 assert.equal(dated.value,2.8);
 assert.equal(dated.proven,false,'relative prior calibration remains an unproven estimate');
 assert.deepEqual(s.shots.slice(0,3),original,'existing history is never rewritten');
});
