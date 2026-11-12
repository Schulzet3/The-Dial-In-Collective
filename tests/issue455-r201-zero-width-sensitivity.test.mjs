import test from 'node:test';
import assert from 'node:assert/strict';
import {learnSensitivity} from '../site/lib/engine.js';

// Source-only synthetic legacy shot rows: no member accounts, API or SQL.
const version={grinderMin:0,grinderMax:10};
const makeShots=(snapshots)=>[2,3,4].map((dial,i)=>({
 id:'synthetic-'+i,coffeeId:'same-coffee',style:'Turbo',setupVersionId:'version',
 calibrationId:'calibration',basketId:'basket',feedMode:'standard',
 timestamp:new Date(Date.UTC(2026,10,10,12,i)).toISOString(),
 doseG:18,yieldG:36,timeS:32-i*4,grindSetting:dial,tempC:93,
 snapshot:snapshots[i],hidden:false,notes:'Original private history stays unchanged'
}));
test('R201 valid recorded nondegenerate ranges retain observed same-coffee slope',()=>{
 const shots=makeShots(Array.from({length:3},()=>({grinderMin:0,grinderMax:10})));
 const before=structuredClone(shots);
 assert.deepEqual(learnSensitivity(shots,version),{secondsPerUnit:-4,samples:2});
 assert.deepEqual(shots,before);
});
test('R201 zero-width imported snapshots cannot jointly manufacture sensitivity evidence',()=>{
 const shots=makeShots([2,3,4].map(x=>({grinderMin:x,grinderMax:x})));
 const before=structuredClone(shots);
 assert.equal(learnSensitivity(shots,version),null);
 assert.deepEqual(shots,before);
});
test('R201 invalid middle shot does not bridge two valid intervals into two corroborating slopes',()=>{
 const shots=makeShots([
  {grinderMin:0,grinderMax:10},{grinderMin:3,grinderMax:3},
  {grinderMin:0,grinderMax:10}
 ]);
 assert.equal(learnSensitivity(shots,version),null);
});
test('R201 valid inclusive snapshot endpoints remain admissible',()=>{
 const shots=makeShots(Array.from({length:3},()=>({grinderMin:2,grinderMax:4})));
 assert.deepEqual(learnSensitivity(shots,version),{secondsPerUnit:-4,samples:2});
});
test('R201 reversed historical range stays excluded',()=>{
 const shots=makeShots(Array.from({length:3},()=>({grinderMin:6,grinderMax:1})));
 assert.equal(learnSensitivity(shots,version),null);
});
test('R201 missing legacy snapshots keep pre-existing measured-history fallback',()=>{
 const shots=makeShots([null,null,null]);
 assert.deepEqual(learnSensitivity(shots,version),{secondsPerUnit:-4,samples:2});
});
