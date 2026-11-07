import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCurrent,familyStats} from '../site/lib/engine.js';

// R455-094: source-synthetic local archives only, no member, Auth or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function make(){
 const shot={id:'legacy',coffeeId:'coffee',setupVersionId:'version',
  style:'Turbo',familyId:'family',hidden:false,dialedIn:true,
  tasteScales:{...green},doseG:18,yieldG:36,timeS:20,
  notes:'Original member-style private note',timestamp:'2026-11-05T12:00:00Z'};
 const coffee={style:'Traditional',currentFamilies:{},favoriteShots:{}};
 return {activeSetupId:'setup',setups:[{id:'setup',activeVersionId:'version',
  versions:[{id:'version'}],workspaces:{version:{coffees:{coffee}}}}],shots:[shot],
  families:[{id:'family',coffeeId:'coffee',style:'Turbo'}],audit:[]};
}
function refused(patch){
 const s=make();Object.assign(s.shots[0],patch);const original=structuredClone(s);
 assert.equal(familyStats(s,'family').count,0,'The same imported shot is not measured recipe evidence');
 assert.throws(()=>makeCurrent(s,'legacy'),/valid recorded dose, yield and time/);
 assert.deepEqual(s,original,'Rejected Make Current preserves all history, ratings and preferences');
}
test('R094 recorded dose must be finite and within existing Log Shot 5-40 g bounds',()=>{
 for(const doseG of [null,0,4.9,40.1,NaN,Infinity,'18'])refused({doseG});
});
test('R094 imported yield outside existing 5-200 g bounds cannot become a favorite',()=>{
 for(const yieldG of [null,0,4.9,200.1,NaN,Infinity,'36'])refused({yieldG});
});
test('R094 imported time outside existing 1-180 s bounds cannot become a favorite',()=>{
 for(const timeS of [null,0,.9,180.1,NaN,Infinity,'20'])refused({timeS});
});
test('R094 valid inclusive physical endpoints and actual all-green tastes keep manual selection',()=>{
 for(const values of [{doseG:5,yieldG:5,timeS:1},{doseG:40,yieldG:200,timeS:180},
  {doseG:18,yieldG:36,timeS:20}]){
  const s=make();Object.assign(s.shots[0],values);const before=structuredClone(s.shots);
  makeCurrent(s,'legacy');
  const c=s.setups[0].workspaces.version.coffees.coffee;
  assert.equal(c.currentFamilies.Turbo,'family');
  assert.equal(c.favoriteShots.family,'legacy');
  assert.equal(c.style,'Turbo');assert.equal(s.audit.length,1);
  assert.deepEqual(s.shots,before,'Successful selection does not change original measurements or notes');
 }
});
test('R094 a valid older family remains selectable when a later all-green archive is unmeasured',()=>{
 const s=make();s.shots[0].id='older';
 s.shots.push({...structuredClone(s.shots[0]),id:'newer',timestamp:'2026-11-06T12:00:00Z',
  yieldG:230,notes:'Do not overwrite original bad reading'});
 const original=structuredClone(s.shots);
 assert.throws(()=>makeCurrent(s,'newer'),/valid recorded dose, yield and time/);
 makeCurrent(s,'older');
 assert.equal(s.setups[0].workspaces.version.coffees.coffee.favoriteShots.family,'older');
 assert.deepEqual(s.shots,original);
});
test('R094 missing taste, hidden, and old-setup guards remain in place',()=>{
 for(const patch of [{tasteScales:{...green,sweetness:null}},{hidden:true},
  {setupVersionId:'old-setup'}]){
  const s=make();Object.assign(s.shots[0],patch);
  const original=structuredClone(s);
  assert.throws(()=>makeCurrent(s,'legacy'));
  assert.deepEqual(s,original);
 }
});
