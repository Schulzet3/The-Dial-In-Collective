import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,shotPayload} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,validateShot} from '../site/lib/model.js';
import {saveShot} from '../site/lib/engine.js';

// Synthetic state only. No actual member records, provider calls, or production writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const make=()=>hydrate(rawFixture());
const input=(s,overrides={})=>({
 id:'r242-scalar',basketId:activeVersion(s).baskets.find(b=>!b.archived).id,
 style:'Turbo',feedMode:'standard',
 doseG:18,yieldG:44,timeS:17,grindSetting:2,tempC:null,
 notes:'Keep the original private note',tasteScales:{...green},...overrides
});

test('R242 non-scalar dose, yield, and time are rejected before any personal-state mutation',()=>{
 for(const field of ['doseG','yieldG','timeS']){
  const valid={doseG:18,yieldG:44,timeS:17}[field];
  for(const value of [[valid],{value:valid},Object(valid),BigInt(valid)]){
   const s=make(),d=input(s,{[field]:value}),before=structuredClone(s);
   assert.match(validateShot(d).join(' '),new RegExp(field==='doseG'?'Dose must':field==='yieldG'?'Yield must':'Time must'));
   assert.throws(()=>saveShot(s,'coffee',d),/must be between/);
   assert.deepEqual(s,before,field+' non-scalar input must not alter member state');
  }
 }
});
test('R242 supplied non-scalar optional temperature cannot become a recorded numeric reading',()=>{
 for(const value of [[91],{value:91},new Number(91),91n]){
  const s=make(),d=input(s,{tempC:value}),before=structuredClone(s);
  assert.match(validateShot(d).join(' '),/Check temperature/);
  assert.throws(()=>saveShot(s,'coffee',d),/Check temperature/);
  assert.deepEqual(s,before);
 }
});
test('R242 genuine numeric strings and scalar numbers preserve all original five ratings and notes',()=>{
 const s=make();activeVersion(s).advanced.temperature=true;
 const d=input(s,{doseG:'18',yieldG:'44',timeS:'17',grindSetting:'2',tempC:'91'});
 assert.deepEqual(validateShot(d),[]);
 const outbound=shotPayload(s,'coffee',d);
 assert.equal(outbound.dose_g,18);assert.equal(outbound.yield_g,44);assert.equal(outbound.time_s,17);
 const sh=saveShot(s,'coffee',d);
 assert.equal(sh.doseG,18);assert.equal(sh.yieldG,44);assert.equal(sh.timeS,17);
 assert.equal(sh.tempC,91);assert.equal(sh.notes,d.notes);assert.deepEqual(sh.tasteScales,green);
 assert.equal(s.shots.length,1);
});
test('R242 existing same-coffee offline replay keeps untouched non-scalar legacy original',()=>{
 const s=make(),prior={id:'r242-prior',coffeeId:'coffee',doseG:[18],timeS:[17],
  notes:'Historical original cannot be rewritten',tasteScales:{...green}};
 s.shots.push(prior);const before=structuredClone(s);
 assert.strictEqual(saveShot(s,'coffee',input(s,{id:prior.id,doseG:[18]})),prior);
 assert.deepEqual(s,before);
});
