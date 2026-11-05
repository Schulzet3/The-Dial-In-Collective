import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,prefill} from '../site/lib/engine.js';
test('standard successful setting 3 produces a cautious slow-feed starting estimate of 1',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],c=s.coffees[0];
 s.shots.push({id:'past',coffeeId:c.id,style:'Turbo',feedMode:'standard',
  setupVersionId:v.id,calibrationId:v.calibrationId,basketId:v.baskets[0].id,
  hidden:false,dialedIn:true,grindSetting:3,
  timestamp:'2026-11-04T12:00:00.000Z'});
 const estimate=grindGuidance(s,c,'Turbo',v.baskets[0],'slow');
 assert.equal(estimate.value,1);assert.equal(estimate.proven,false);
 assert.match(estimate.source,/Slow Feed starting estimate/);
 assert.equal(prefill(s,c.id,{style:'Turbo',feedMode:'slow'}).grindSetting,'');
 assert.equal(prefill(s,c.id,{style:'Turbo',feedMode:'standard'}).grindSetting,3);
});
