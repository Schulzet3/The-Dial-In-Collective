import test from 'node:test';
import assert from 'node:assert/strict';
import {blankState,createSetup,addCoffee,visibleCoffees,workspace,hideCoffee,validateBackup} from '../site/lib/model.js';

function fixture(){
 const s=blankState();
 createSetup(s,{name:'Home espresso',basketDoseG:18,grinderMin:0,grinderMax:10});
 const legacy=addCoffee(s,{name:'Legacy',roaster:'Same Roaster'});
 const missing=addCoffee(s,{name:'Missing',roaster:'Same Roaster'});
 const dated=addCoffee(s,{name:'Dated',roaster:'Same Roaster'});
 legacy.createdAt=null;
 delete missing.createdAt;
 dated.createdAt='2026-11-04T13:00:00Z';
 return {s,legacy,missing,dated,w:workspace(s)};
}

test('#455 coffee browsing tolerates backup-accepted missing createdAt without losing coffee or changing existing order',()=>{
 const {s,legacy,missing,dated,w}=fixture();
 assert.doesNotThrow(()=>validateBackup(s),'schema-1 backup admits these historical dates');
 const before=structuredClone(s);
 const ids=visibleCoffees(s,'recent').map(c=>c.id);
 assert.deepEqual(ids,[dated.id,legacy.id,missing.id],
  'dated coffee sorts first and undated original entries remain visible and stable');
 assert.deepEqual(visibleCoffees(s,'az').map(c=>c.id),[dated.id,legacy.id,missing.id],
  'alphabetical choice is not changed');
 w.currentCoffeeId=missing.id;
 assert.deepEqual(visibleCoffees(s,'recent').map(c=>c.id),[missing.id,dated.id,legacy.id],
  'the current coffee remains pinned without a timestamp');
 assert.deepEqual(visibleCoffees(s,'recent','Dated').map(c=>c.id),[dated.id],
  'search never pins an unrelated coffee');
 w.currentCoffeeId=null;
 assert.deepEqual(s,before,'listing never changes original coffee metadata or workspace');
});

test('#455 cloud/backup nonstring recents cannot crash coffee browsing and valid recency still leads',()=>{
 const {s,legacy,missing,dated,w}=fixture();
 w.recent[legacy.id]=42;
 w.recent[missing.id]=null;
 w.recent[dated.id]='2026-11-04T17:00:00Z';
 const before=structuredClone(s);
 assert.deepEqual(visibleCoffees(s,'recent').map(c=>c.id),[dated.id,legacy.id,missing.id]);
 assert.deepEqual(s,before,'preserve legacy recency values, not normalize stored records');
});

test('#455 hiding selected coffee safely reselects a truly dated eligible coffee and preserves shots',()=>{
 const {s,legacy,missing,dated,w}=fixture();
 w.currentCoffeeId=dated.id;
 w.recent[dated.id]='2026-11-04T18:00:00Z';
 w.recent[legacy.id]='2026-11-04T16:00:00Z';
 w.recent[missing.id]=17;
 s.shots.push({id:'kept-shot',coffeeId:legacy.id,notes:'Original private note',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:4,astringency:1},
  timestamp:null,doseG:18,yieldG:36,timeS:25,grindSetting:4});
 const shots=structuredClone(s.shots);
 assert.doesNotThrow(()=>hideCoffee(s,dated.id,true));
 assert.equal(w.currentCoffeeId,legacy.id,'choose dated remaining recent coffee over invalid numeric recency');
 assert.equal(dated.hidden,true);
 assert.deepEqual(s.shots,shots,'do not change measured shots, ratings or private notes');
 assert.deepEqual(visibleCoffees(s,'recent').map(c=>c.id),[legacy.id,missing.id]);
});
