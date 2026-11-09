import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion,coffeeState} from '../site/lib/model.js';
import {saveShot} from '../site/lib/engine.js';

// R455-125 only synthetic records; no member or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const state=()=>hydrate(rawFixture());
const input=(id,basketId)=>({id,basketId,style:'Turbo',feedMode:'standard',
 doseG:18,yieldG:44,timeS:17,grindSetting:2,tempC:null,
 tasteScales:{...green},notes:'Retain five ratings and original private notes'});

test('R125 new Log Shot rejects archived explicit basket without touching personal state',()=>{
 const s=state(),v=activeVersion(s);
 v.baskets.push({id:'retired-28',name:'Retired',doseG:28,archived:true});
 const before=structuredClone(s);
 assert.throws(()=>saveShot(s,'coffee',input('invalid-archived','retired-28')),
  /Select an active basket/);
 assert.deepEqual(s,before);
});
test('R125 new Log Shot rejects missing and unknown basket IDs without silently relabeling',()=>{
 for(const id of [undefined,null,'not-a-real-basket']){
  const s=state(),before=structuredClone(s);
  assert.throws(()=>saveShot(s,'coffee',input('invalid-reference',id)),
   /Select an active basket/);
  assert.deepEqual(s,before,'no incorrect saved shot, preference or audit');
 }
});
test('R125 valid explicit active alternative saves matched basket ID, snapshot and original ratings',()=>{
 const s=state(),v=activeVersion(s);
 v.baskets.push({id:'active-22',name:'Active 22g',doseG:22,archived:false});
 const sh=saveShot(s,'coffee',input('valid-active','active-22'));
 assert.equal(sh.basketId,'active-22');
 assert.equal(sh.snapshot.basketId,'active-22');
 assert.equal(sh.snapshot.basketDoseG,22);
 assert.deepEqual(sh.tasteScales,green);
 assert.equal(sh.notes,'Retain five ratings and original private notes');
 assert.equal(coffeeState(s,'coffee').basketId,'active-22');
 assert.equal(s.shots.length,1);
});
test('R125 archived-after-save basket preserves idempotent offline replay and original shot',()=>{
 const s=state(),v=activeVersion(s),data=input('offline-duplicate','basketv');
 const original=saveShot(s,'coffee',data);
 v.baskets.push({id:'other-active',name:'Active',doseG:18,archived:false});
 v.baskets.find(b=>b.id==='basketv').archived=true;
 const before=structuredClone(s);
 assert.equal(saveShot(s,'coffee',data),original);
 assert.equal(s.shots.length,1);
 assert.deepEqual(s,before,'no rewrite to an old shot or audit on idempotent replay');
});
