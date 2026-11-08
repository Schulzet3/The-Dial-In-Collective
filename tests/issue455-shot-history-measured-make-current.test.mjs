import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shotCard} from '../site/cloud/shot_card.js';
import {makeCurrent} from '../site/lib/engine.js';

// R455-104: synthetic historical records; no member data or provider writes.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const source={id:'older-green',coffeeId:'coffee',setupVersionId:'version',style:'Turbo',
 familyId:'family',dialedIn:true,hidden:false,cloudPending:false,
 doseG:18,yieldG:36,timeS:17,grindSetting:5.5,
 tasteScales:green,notes:'Preserve original private historical notes',
 timestamp:'2026-11-07T09:00:00Z'};
function state(shot){
 return {activeSetupId:'setup',setups:[{id:'setup',activeVersionId:'version',
  versions:[{id:'version'}],workspaces:{version:{coffees:{coffee:{
   style:'Traditional',currentFamilies:{},favoriteShots:{}}}}}}],
  shots:[shot],audit:[],families:[{id:'family',coffeeId:'coffee',style:'Turbo'}]};
}
const options={expanded:true,activeVersionId:'version'};
test('R104 physically invalid all-green history keeps notes and green ratings but offers no impossible Make Current',()=>{
 const invalid=[
  {doseG:0},{doseG:4.9},{doseG:40.1},{doseG:null},{doseG:'18'},{doseG:Infinity},
  {yieldG:0},{yieldG:4.9},{yieldG:200.1},{yieldG:'36'},{yieldG:NaN},
  {timeS:0},{timeS:.9},{timeS:180.1},{timeS:'17'},{timeS:-Infinity}
 ];
 for(const patch of invalid){
  const shot={...structuredClone(source),...patch},before=structuredClone(shot);
  const html=shotCard(shot,options);
  assert.match(html,/<span class="status-badge">Dialed In<\/span>/);
  assert.doesNotMatch(html,/data-action="make-current"/);
  assert.match(html,/data-action="edit"/);
  assert.match(html,/Preserve original private historical notes/);
  assert.deepEqual(shot,before,'history/card rendering must not rewrite original measurements or tastes');
  const s=state(shot),snapshot=structuredClone(s);
  assert.throws(()=>makeCurrent(s,shot.id),/valid recorded dose, yield and time/);
  assert.deepEqual(s,snapshot,'refused engine action does not mutate member history');
 }
});
test('R104 valid inclusive physical bounds keep Make Current available for matching setup',()=>{
 for(const values of [{doseG:5,yieldG:5,timeS:1},
  {doseG:40,yieldG:200,timeS:180},{doseG:18,yieldG:36,timeS:17}]){
  const shot={...structuredClone(source),...values},before=structuredClone(shot);
  const html=shotCard(shot,options);
  assert.match(html,/data-action="make-current"/);
  const s=state(shot);makeCurrent(s,shot.id);
  assert.equal(s.setups[0].workspaces.version.coffees.coffee.favoriteShots.family,shot.id);
  assert.deepEqual(shot,before);
 }
});
test('R104 missing fifth rating, pending sync or other version still cannot show Make Current',()=>{
 const cases=[
  [{...source,tasteScales:{...green,sweetness:null}},options],
  [{...source,cloudPending:true},options],
  [source,{expanded:true,activeVersionId:'different'}]
 ];
 for(const [shot,opts] of cases){
  const html=shotCard(shot,opts);
  assert.doesNotMatch(html,/data-action="make-current"/);
 }
});

test('R114 missing legacy family ID keeps all-five-green History but cannot create phantom Current',()=>{
 for(const familyId of [null,undefined,'','   ',0]){
  const shot={...structuredClone(source),familyId},before=structuredClone(shot);
  const html=shotCard(shot,options);
  assert.match(html,/class="status-badge">Dialed In/);
  assert.doesNotMatch(html,/data-action="make-current"/);
  assert.match(html,/data-action="edit"/);
  assert.match(html,/Preserve original private historical notes/);
  const s=state(shot),snapshot=structuredClone(s);
  assert.throws(()=>makeCurrent(s,shot.id),/assigned recipe family/);
  assert.deepEqual(s,snapshot,'reject without phantom Current, favorite, or audit mutation');
  assert.deepEqual(shot,before,'original measurements, notes and five tastes are immutable');
 }
});
test('R114 explicitly assigned family remains selectable with exact prior preference semantics',()=>{
 const shot=structuredClone(source),before=structuredClone(shot),s=state(shot);
 assert.match(shotCard(shot,options),/data-action="make-current"/);
 makeCurrent(s,shot.id);
 const p=s.setups[0].workspaces.version.coffees.coffee;
 assert.equal(p.currentFamilies.Turbo,'family');
 assert.equal(p.favoriteShots.family,shot.id);
 assert.equal(Object.keys(p.favoriteShots).length,1);
 assert.deepEqual(shot,before);
});

test('R116 dangling or mismatched archived family cannot become phantom Current',()=>{
 for(const families of [
  [],[{id:'elsewhere',coffeeId:'coffee',style:'Turbo'}],
  [{id:'family',coffeeId:'different-coffee',style:'Turbo'}],
  [{id:'family',coffeeId:'coffee',style:'Traditional'}]
 ]){
  const shot=structuredClone(source),original=structuredClone(shot);
  const html=shotCard(shot,{...options,familyRecorded:false});
  assert.match(html,/class="status-badge">Dialed In/);
  assert.doesNotMatch(html,/data-action="make-current"/);
  assert.match(html,/Preserve original private historical notes/);
  const s=state(shot);s.families=structuredClone(families);
  const before=structuredClone(s);
  assert.throws(()=>makeCurrent(s,shot.id),/matching recorded recipe family/);
  assert.deepEqual(s,before,'refused dangling family cannot modify preference or audit');
  assert.deepEqual(shot,original,'keep historical measurements and all five ratings');
 }
});
test('R116 valid matching family remains explicitly selectable',()=>{
 const shot=structuredClone(source),s=state(shot);
 assert.match(shotCard(shot,{...options,familyRecorded:true}),/data-action="make-current"/);
 makeCurrent(s,shot.id);
 const p=s.setups[0].workspaces.version.coffees.coffee;
 assert.equal(p.currentFamilies.Turbo,'family');
 assert.equal(p.favoriteShots.family,shot.id);
});
test('R116 cloud History computes family existence from actual coffee and style',()=>{
 const sourceFile=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(sourceFile,/const familyLookup=new Set\(s\.families\.map/);
 assert.match(sourceFile,/familyRecorded:familyLookup\.has\(\[sh\.familyId,sh\.coffeeId,sh\.style\]/);
});
