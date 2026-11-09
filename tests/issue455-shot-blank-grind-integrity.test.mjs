import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {validateShot} from '../site/lib/model.js';
import {saveShot} from '../site/lib/engine.js';

const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const state=()=>hydrate(rawFixture());
const shot=grindSetting=>({id:'r133-shot',basketId:'basketv',style:'Turbo',feedMode:'standard',
 doseG:18,yieldG:44,timeS:17,grindSetting,tempC:null,notes:'Original private notes',
 tasteScales:{...green}});

test('R133 whitespace-only grinder reading never persists as measured zero',()=>{
 for(const value of ['', ' ', '   ', '\t', '\n', '\u00a0']){
  const s=state(),input=shot(value),before=structuredClone(s);
  assert.match(validateShot(input).join(' '),/actual grind setting/);
  assert.throws(()=>shotPayload(s,'coffee',input),/actual grind setting/);
  assert.throws(()=>saveShot(s,'coffee',input),/actual grind setting/);
  assert.deepEqual(s,before);
 }
});
test('R133 non-scalar inputs cannot coerce to measured zero',()=>{
 for(const value of [[],{},null,undefined,false]){
  const s=state(),input=shot(value),before=structuredClone(s);
  assert.match(validateShot(input).join(' '),/actual grind setting/);
  assert.throws(()=>saveShot(s,'coffee',input),/actual grind setting/);
  assert.deepEqual(s,before);
 }
});
test('R133 genuine grinder zero preserves original notes and five ratings',()=>{
 for(const value of [0,'0']){
  const s=state(),input=shot(value);
  assert.deepEqual(validateShot(input),[]);
  assert.equal(shotPayload(s,'coffee',input).grind_setting,0);
  const saved=saveShot(s,'coffee',input);
  assert.equal(saved.grindSetting,0);
  assert.equal(saved.notes,'Original private notes');
  assert.deepEqual(saved.tasteScales,green);
  assert.equal(s.shots.length,1);
 }
});
test('R133 numeric strings remain valid, missing fifth rating remains invalid',()=>{
 for(const value of [2.5,' 2.5 ']){
  const s=state(),input=shot(value);
  assert.deepEqual(validateShot(input),[]);
  assert.equal(shotPayload(s,'coffee',input).grind_setting,2.5);
  assert.equal(saveShot(s,'coffee',input).grindSetting,2.5);
 }
 const missing=shot(2.5);delete missing.tasteScales.sweetness;
 assert.match(validateShot(missing).join(' '),/all five taste scales/);
});
