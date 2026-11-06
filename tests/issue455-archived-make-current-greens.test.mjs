import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCurrent} from '../site/lib/engine.js';

const ideal={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(tasteScales=ideal,dialedIn=true){
 const shot={id:'archived-original',coffeeId:'coffee',setupVersionId:'version',
  style:'Turbo',familyId:'family',hidden:false,dialedIn,tasteScales,
  doseG:18,yieldG:45,timeS:18,notes:'Original personal shot notes'};
 return {activeSetupId:'setup',setups:[{id:'setup',activeVersionId:'version',
  versions:[{id:'version'}],workspaces:{version:{coffees:{coffee:{
   style:'Traditional',currentFamilies:{},favoriteShots:{}}}}}}],shots:[shot],audit:[]};
}
test('#455 local Make Current refuses false historical success without mutating private state',()=>{
 const invalid=[
  [{...ideal,sweetness:null},true],
  [{...ideal,clarity:4},true],
  [{...ideal,extraction:'3'},true],
  [{extraction:3,body:3,clarity:5,astringency:1},true],
  [ideal,'true'],
  [ideal,false],
 ];
 for(const [tastes,flag] of invalid){
  const s=fixture(tastes,flag),before=structuredClone(s);
  assert.throws(()=>makeCurrent(s,'archived-original'),/visible all-green shot/);
  assert.deepEqual(s,before,'refused favorite cannot alter shot, notes, five scales, preferences, or audit');
 }
});
test('#455 genuine five green ratings still permit explicit Make Current with preserved raw shot',()=>{
 const s=fixture(),before=structuredClone(s.shots);
 makeCurrent(s,'archived-original');
 const coffee=s.setups[0].workspaces.version.coffees.coffee;
 assert.equal(coffee.currentFamilies.Turbo,'family');
 assert.equal(coffee.favoriteShots.family,'archived-original');
 assert.equal(coffee.style,'Turbo');
 assert.equal(s.audit.length,1);
 assert.deepEqual(s.shots,before,'selection never edits original shot measurements, ratings or notes');
});
test('#455 hidden, wrong equipment version and unknown shot cannot become Current',()=>{
 for(const mutate of [s=>s.shots[0].hidden=true,s=>s.shots[0].setupVersionId='old-version',s=>s.shots=[]]){
  const s=fixture();mutate(s);const before=structuredClone(s);
  assert.throws(()=>makeCurrent(s,'archived-original'));
  assert.deepEqual(s,before);
 }
});
