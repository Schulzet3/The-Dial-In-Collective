import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createSetup,reviseSetup,activeVersion,snapshot} from '../site/lib/model.js';

// Synthetic setup and archived private-history records; no provider or member access.
const input=tempUnit=>({name:'Demo setup',basketDoseG:18,grinderMin:0,grinderMax:5,
 machine:'Test machine',grinder:'Test grinder',burrs:'Test burrs',tempUnit});

test('#455 R304 new setup persists only supported F/C temperature preferences into shot snapshots',()=>{
 for(const [unit,expected] of [['F','F'],['C','C'],['K','F'],['Kelvin','F'],['unknown','F'],
  ['<unsupported>','F'],['','F'],[null,'F'],[undefined,'F']]){
  const state=blankState();
  createSetup(state,input(unit));
  const v=activeVersion(state);
  assert.equal(v.tempUnit,expected,String(unit));
  assert.equal(snapshot(state,'demo-coffee',v.defaultBasketId).tempUnit,expected);
  assert.equal(state.shots.length,0);
 }
});

test('#455 R304 setup revisions accept C/F and reject unsupported future snapshot unit without altering historical records',()=>{
 const state=blankState();
 createSetup(state,input('C'));
 const v=activeVersion(state),archive={id:'archived',tempC:93,notes:'Private source <original>',
   tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
   snapshot:snapshot(state,'demo-coffee',v.defaultBasketId)};
 state.shots.push(archive);
 const original=structuredClone(archive),id=v.id,calibration=v.calibrationId;
 reviseSetup(state,input('Kelvin'));
 assert.equal(activeVersion(state).tempUnit,'F');
 assert.equal(snapshot(state,'demo-coffee',v.defaultBasketId).tempUnit,'F');
 assert.equal(activeVersion(state).id,id);
 assert.equal(activeVersion(state).calibrationId,calibration);
 assert.deepEqual(state.shots[0],original,'do not mutate measured historical shot, notes or five ratings');
 reviseSetup(state,input('C'));
 assert.equal(activeVersion(state).tempUnit,'C');
 assert.deepEqual(state.shots[0],original);
 reviseSetup(state,input('F'));
 assert.equal(activeVersion(state).tempUnit,'F');
 assert.deepEqual(state.shots[0],original);
});
