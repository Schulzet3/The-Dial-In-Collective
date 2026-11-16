import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {recommendation} from '../site/lib/engine.js';

// R306 synthetic imported-history cases only; no member/SQL/provider writes.
const rated={extraction:2,body:3,clarity:5,sweetness:4,astringency:1};
function state() {
 const s=hydrate(rawFixture());s.shots=[];s.families=[];s.communityEvidence={};return s;
}
function row(id,timestamp,patch={}) {
 return {id,coffeeId:'coffee',setupVersionId:'version',calibrationId:'cal',
  basketId:'basketv',style:'Turbo',feedMode:'standard',hidden:false,
  doseG:20,yieldG:50,timeS:22,grindSetting:1.2,tempC:null,timestamp,
  dialedIn:false,tasteScales:{...rated},notes:'Original private '+id,
  snapshot:{grinderMin:0,grinderMax:5},
  suggestion:{title:'Recorded next',text:'Original archived proposal',
   next:{grindSetting:1.2,yieldCenter:55}},...patch};
}
const advice=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
test('R306 newer measured but partially unrated archive never hijacks earlier rated advice',()=>{
 const s=state();
 const older=row('older-rated','2026-11-14T12:00:00Z');
 const newer=row('newer-partial','2026-11-15T12:00:00Z',{
  tasteScales:{...rated,sweetness:null},
  suggestion:{title:'Stale imported advice',text:'Not validated by five ratings',
   next:{grindSetting:1.2,yieldCenter:75}}});
 s.shots.push(older,newer);
 const before=structuredClone(s),r=advice(s);
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,55,'only the older, fully rated shot may drive next yield');
 assert.equal(r.grind.value,1.2);
 assert.equal(r.doseG,20);
 assert.deepEqual(s,before,'do not alter saved measurements, notes or missing ratings');
});
test('R306 only incomplete imported ratings never manufacture a personal adjustment',()=>{
 const s=state();
 s.shots.push(row('incomplete','2026-11-15T12:00:00Z',{
  tasteScales:{...rated,clarity:null},
  suggestion:{title:'Unsafe cached next',text:'Imported',
   next:{grindSetting:1.2,yieldCenter:75}}}));
 const before=structuredClone(s),r=advice(s);
 assert.equal(r.source,'Starting recommendation');
 assert.equal(r.familyId,null);
 assert.deepEqual(s,before);
});
test('R306 fully rated newest measured shot retains its original cached next-step priority',()=>{
 const s=state();s.shots.push(row('older','2026-11-14T12:00:00Z'));
 s.shots.push(row('newer','2026-11-15T12:00:00Z',{
  suggestion:{title:'Last fully rated shot',text:'Archived verified five ratings',
   next:{grindSetting:1.2,yieldCenter:75}}}));
 const before=structuredClone(s),r=advice(s);
 assert.equal(r.source,'Adjustment from your latest taste rating');
 assert.equal(r.yield.center,75);
 assert.deepEqual(s,before);
});
