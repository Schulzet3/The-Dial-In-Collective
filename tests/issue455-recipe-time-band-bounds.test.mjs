import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture} from './cloud-fixtures/raw.js';
import {activeVersion} from '../site/lib/model.js';
import {recommendation} from '../site/lib/engine.js';
import {CONFIG,goodTaste} from '../site/lib/constants.js';
import {recipeGrid} from '../site/lib/ui.js';

// Synthetic, offline-only fixtures. No live member or provider access.
function oneSuccess(timeS){
 const s=hydrate(rawFixture()),v=activeVersion(s);
 const shot={id:'single-success',coffeeId:'coffee',setupVersionId:v.id,
  calibrationId:v.calibrationId,basketId:'basketv',style:'Turbo',
  feedMode:'standard',doseG:20,yieldG:50,timeS,grindSetting:1.2,tempC:91,
  timestamp:'2026-11-08T08:00:00Z',hidden:false,dialedIn:true,
  familyId:'family',tasteScales:goodTaste(),notes:'Original retained'};
 s.shots.push(shot);
 s.families.push({id:'family',coffeeId:'coffee',style:'Turbo',createdAt:shot.timestamp});
 return s;
}
const card=s=>recommendation(s,'coffee',{style:'Turbo',basketId:'basketv',feedMode:'standard'});
test('R110 upper time endpoint has valid displayed band and original unchanged',()=>{
 const s=oneSuccess(CONFIG.bounds.timeS[1]),prior=structuredClone(s),r=card(s);
 assert.equal(r.source,'Your dialed in window');
 assert.deepEqual({low:r.time.low,center:r.time.center,high:r.time.high},{low:178,center:180,high:180});
 assert.match(recipeGrid(r),/178\.0<span class="range-dash">\u2013<\/span>180\.0/);
 assert.equal(r.ratio.center,2.5);
 assert.equal(r.grind.value,1.2);
 assert.deepEqual(s,prior);
});
test('R110 lower time endpoint cannot display negative time',()=>{
 const s=oneSuccess(CONFIG.bounds.timeS[0]),prior=structuredClone(s),r=card(s);
 assert.deepEqual({low:r.time.low,center:r.time.center,high:r.time.high},{low:1,center:1,high:3});
 assert.deepEqual(s,prior);
});
test('R110 ordinary time range and five tastes remain unchanged',()=>{
 const s=oneSuccess(22),prior=structuredClone(s),r=card(s);
 assert.deepEqual({low:r.time.low,center:r.time.center,high:r.time.high},{low:20,center:22,high:24});
 assert.deepEqual(s.shots[0].tasteScales,goodTaste());
 assert.deepEqual(s,prior);
});
