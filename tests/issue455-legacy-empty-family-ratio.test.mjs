import test from 'node:test';
import assert from 'node:assert/strict';
import {assignFamily,familyStats} from '../site/lib/engine.js';

// Isolated historic fixtures; no live member records or provider calls.
const newShot={id:'new',coffeeId:'coffee',style:'Turbo',doseG:18,yieldG:36,dialedIn:true};
function state(doseG,extras=[]){
 return {families:[{id:'historic',coffeeId:'coffee',style:'Turbo',seedRatio:2}],
  shots:[{id:'historic-shot',coffeeId:'coffee',style:'Turbo',familyId:'historic',
   hidden:false,dialedIn:true,doseG,yieldG:36,timeS:25,notes:'Original private note',
   tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}},...extras]};
}
test('#455 an unmeasured old green family never crashes a new family assignment',()=>{
 for(const dose of [null,0,Number.NaN]){
  const s=state(dose),before=structuredClone(s.shots);
  assert.equal(familyStats(s,'historic').ratio,null);
  const id=assignFamily(s,newShot);
  assert.notEqual(id,'historic','unmeasured old ratio is not successful recipe evidence');
  assert.equal(s.families.length,2);
  assert.deepEqual(s.shots,before,'preserve historical shot, notes and five taste values');
 }
});
test('#455 a properly measured family still matches its new successful shot',()=>{
 const s=state(18),before=structuredClone(s.shots);
 assert.equal(familyStats(s,'historic').ratio.center,2);
 assert.equal(assignFamily(s,newShot),'historic');
 assert.equal(s.families.length,1);
 assert.deepEqual(s.shots,before);
});
test('#455 one invalid older entry cannot disqualify a valid family measurement',()=>{
 const s=state(null,[{id:'valid',coffeeId:'coffee',style:'Turbo',familyId:'historic',
  hidden:false,dialedIn:true,doseG:18,yieldG:36,timeS:26,
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}}]);
 const before=structuredClone(s.shots);
 assert.equal(familyStats(s,'historic').ratio.center,2);
 assert.equal(assignFamily(s,newShot),'historic');
 assert.deepEqual(s.shots,before);
});
