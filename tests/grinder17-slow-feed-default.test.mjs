import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance} from '../site/lib/engine.js';
test('slow feed starts finer within calibrated range',()=>{
 const state=hydrate(rawFixture()),version=state.setups[0].versions[0];
 const coffee=state.coffees[0],basket=version.baskets[0];
 assert.equal(grindGuidance(state,coffee,'Turbo',basket,'standard').value,3.8);
 assert.equal(grindGuidance(state,coffee,'Turbo',basket,'slow').value,1.8);
});
