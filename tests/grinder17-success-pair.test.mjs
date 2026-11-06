import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {grindGuidance} from '../site/lib/engine.js';
const base=()=>{const s=hydrate(rawFixture()),v=s.setups[0].versions[0];return{s,v,c:s.coffees[0],basket:v.baskets[0]};};
let i=0;
const add=(s,mode,n,coffeeId='coffee',cal='cal')=>{s.shots.push({
 id:'sample'+(++i),coffeeId,style:'Turbo',feedMode:mode,
 setupVersionId:'version',calibrationId:cal,basketId:'basketv',
 hidden:false,dialedIn:true,grindSetting:n,
 tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1}});};
test('successful slow feed setting is preferred over any generic adjustment',()=>{
 const {s,c,basket}=base();add(s,'standard',3.1);add(s,'slow',0.6);
 assert.equal(grindGuidance(s,c,'Turbo',basket,'slow').value,0.6);
 assert.equal(grindGuidance(s,c,'Turbo',basket,'standard').value,3.1);
});
test('paired same-grinder successful modes give only unproven transfer',()=>{
 const {s,c,basket}=base();add(s,'standard',3);add(s,'slow',0.5);
 const dark={...c,id:'other',roastLevel:'Dark'};s.coffees.push(dark);
 add(s,'standard',4,'other');
 const result=grindGuidance(s,dark,'Turbo',basket,'slow');
 assert.equal(result.value,1.5);assert.equal(result.proven,false);
});
test('old calibration and unrecorded feed never count as current slow successes',()=>{
 const {s,c,basket}=base();add(s,'slow',0.4,'coffee','old');
 add(s,'standard',3,'coffee','old');add(s,null,4);
 assert.equal(grindGuidance(s,c,'Turbo',basket,'slow').value,1.8);
});

test('complete historical calibration can still seed an explicitly unproven translated reference',()=>{
 const {s,c,basket}=base();add(s,'slow',0.4,'coffee','old');
 const older=s.shots.at(-1);
 older.timestamp='2026-10-20T00:00:00Z';
 older.snapshot={grinderMin:0,grinderMax:5};
 const r=grindGuidance(s,c,'Turbo',basket,'slow');
 assert.equal(r.value,0.4);assert.equal(r.proven,false);
 assert.match(r.source,/previous calibration/);
 assert.equal(older.grindSetting,0.4);
});
