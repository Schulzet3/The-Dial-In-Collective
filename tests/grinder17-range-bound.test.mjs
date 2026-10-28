import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance,recommendation} from '../site/lib/engine.js';
test('recommended number stays inside configured espresso range',()=>{
 const s=hydrate(rawFixture()),v=s.setups[0].versions[0],c=s.coffees[0];
 v.grinderMin=2.5;v.grinderMax=3.5;
 assert.equal(grindGuidance(s,c,'Turbo',v.baskets[0],'slow').value,2.9);
 for(const mode of ['slow','standard']){
  const r=recommendation(s,c.id,{style:'Turbo',feedMode:mode});
  assert.ok(r.grind.value>=2.5&&r.grind.value<=3.5);
 }
});
