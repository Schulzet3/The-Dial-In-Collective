import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {saveShot} from '../site/lib/engine.js';
import {activeVersion} from '../site/lib/model.js';

// R455-128 synthetic personal-state cases, no member/provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const state=()=>hydrate(rawFixture());
const input=id=>({id,basketId:'basketv',style:'Turbo',feedMode:'standard',
 doseG:18,yieldG:44,timeS:17,grindSetting:2,tempC:null,
 tasteScales:{...green},notes:'Original private notes remain literal'});
const withSecondCoffee=()=>{
 const s=state();
 s.coffees.push({...structuredClone(s.coffees.find(c=>c.id==='coffee')),
  id:'coffee-b',name:'Another actual coffee identity'});
 return s;
};

test('R128 reused offline shot ID from another coffee fails before state mutation',()=>{
 const s=withSecondCoffee(),first=saveShot(s,'coffee',input('collision-id'));
 const before=structuredClone(s);
 assert.throws(()=>saveShot(s,'coffee-b',input('collision-id')),
  /shot ID already belongs to a different coffee/);
 assert.deepEqual(s,before,'no incorrect shot, preference, notes, ratings or audit');
 assert.equal(s.shots[0],first);
 assert.equal(first.coffeeId,'coffee');
 assert.deepEqual(first.tasteScales,green);
 assert.equal(first.notes,'Original private notes remain literal');
});
test('R128 same-coffee offline idempotency still returns the original shot after basket retirement',()=>{
 const s=state(),data=input('same-coffee-replay');
 const first=saveShot(s,'coffee',data);
 activeVersion(s).baskets.find(x=>x.id==='basketv').archived=true;
 const before=structuredClone(s);
 assert.equal(saveShot(s,'coffee',data),first);
 assert.deepEqual(s,before);
 assert.equal(s.shots.length,1);
});
test('R128 different fresh IDs remain independently loggable for different coffees',()=>{
 const s=withSecondCoffee();
 const a=saveShot(s,'coffee',input('coffee-a-shot'));
 const b=saveShot(s,'coffee-b',input('coffee-b-shot'));
 assert.equal(s.shots.length,2);
 assert.equal(a.coffeeId,'coffee');
 assert.equal(b.coffeeId,'coffee-b');
 assert.notEqual(a.id,b.id);
 assert.deepEqual(a.tasteScales,green);
 assert.deepEqual(b.tasteScales,green);
});
