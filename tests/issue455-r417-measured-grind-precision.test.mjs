import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,validateShot} from '../site/lib/model.js';
import {saveShot,editShot} from '../site/lib/engine.js';
import {shotSummary} from '../site/lib/ui.js';

// Synthetic only; no member or provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const state=()=>hydrate(rawFixture());
const draft=(s,grindSetting='0.15',id='r417-actual')=>({
 id,basketId:activeVersion(s).baskets.find(b=>!b.archived).id,
 style:'Turbo',feedMode:'standard',doseG:18,yieldG:44,timeS:17,
 grindSetting,tempC:null,notes:'Exact private original shot note',
 tasteScales:{...green}
});
const fractionalRange=s=>{const v=activeVersion(s);v.grinderMin=.15;v.grinderMax=2.55;};

test('R417 cloud new shot retains actual fractional grinder measurement and five ratings',()=>{
 const s=state();fractionalRange(s);const d=draft(s),before=structuredClone(s);
 assert.deepEqual(validateShot(d),[]);
 const payload=shotPayload(s,'coffee',d);
 assert.equal(payload.grind_setting,.15);
 assert.equal(payload.dose_g,18);assert.equal(payload.yield_g,44);
 assert.equal(payload.time_s,17);assert.equal(payload.notes,d.notes);
 assert.deepEqual(payload.taste,green);
 assert.deepEqual(s,before,'Cloud mapping must not mutate original workspace');
});

test('R417 local offline save, History and idempotent replay retain fractional original',()=>{
 const s=state();fractionalRange(s);const d=draft(s);
 const saved=saveShot(s,'coffee',d);
 assert.equal(saved.grindSetting,.15);
 assert.deepEqual(saved.tasteScales,green);assert.equal(saved.notes,d.notes);
 assert.equal(s.shots.length,1);
 assert.ok(shotSummary(saved,'C').includes('Grind 0.15'));
 const before=structuredClone(s);
 assert.strictEqual(saveShot(s,'coffee',{...d,grindSetting:2.1}),saved);
 assert.deepEqual(s,before);
});

test('R417 edit retains corrected measured dial, notes and five tastes',()=>{
 const s=state();fractionalRange(s);
 const saved=saveShot(s,'coffee',draft(s,'0.25'));
 assert.equal(saved.grindSetting,.25);
 const edited=editShot(s,saved.id,{grindSetting:'2.45'});
 assert.equal(edited.grindSetting,2.45);
 assert.deepEqual(edited.tasteScales,green);
 assert.equal(edited.notes,'Exact private original shot note');
 assert.equal(s.shots.length,1);
 assert.ok(shotSummary(edited,'C').includes('Grind 2.45'));
});

test('R417 ordinary tenths and real zero remain; missing fifth rating cannot save',()=>{
 for(const g of [0,'0',2.5,'2.5']){
  const s=state(),d=draft(s,g,'r417-regular');
  assert.deepEqual(validateShot(d),[]);
  assert.equal(shotPayload(s,'coffee',d).grind_setting,Number(g));
  assert.equal(saveShot(s,'coffee',d).grindSetting,Number(g));
 }
 const s=state(),d=draft(s,'0.15','r417-incomplete');
 delete d.tasteScales.sweetness;const before=structuredClone(s);
 assert.match(validateShot(d).join(' '),/Rate all five taste scales/);
 assert.throws(()=>shotPayload(s,'coffee',d),/Rate all five taste scales/);
 assert.throws(()=>saveShot(s,'coffee',d),/Rate all five taste scales/);
 assert.deepEqual(s,before);
});
