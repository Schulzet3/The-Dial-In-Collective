import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {rawFixture,rawShot,TIME} from './cloud-fixtures/raw.js';
import {editShot} from '../site/lib/engine.js';
import {workspace,coffeeState,blankCoffeeState} from '../site/lib/model.js';

// R455-136 synthetic restored preference pointer, not member or provider data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const mismatched={extraction:1,body:3,clarity:5,sweetness:5,astringency:1};

function fixture(){
 const raw=rawFixture();
 raw.families=[
  {id:'short',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2}},created_at:TIME},
  {id:'long',library_entry_id:'coffee',style:'Turbo',statistics:{ratio:{center:2.8}},created_at:TIME}
 ];
 raw.recipePreferences=[{setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',
  style:'Turbo',current_family_id:'short',favorite_shot_id:'short-a',revision:2}];
 raw.shots=[
  rawShot({id:'short-a',personal_family_id:'short',yield_g:36,time_s:23,
   grind_setting:1.1,feed_mode:'standard'}),
  rawShot({id:'long-a',personal_family_id:'long',yield_g:50,time_s:19,
   grind_setting:1.4,feed_mode:'standard',pulled_at:'2026-10-03T12:00:00Z'})
 ];
 const s=hydrate(raw);
 s.coffees.push({...s.coffees[0],id:'other-coffee',name:'Other Original Coffee'});
 workspace(s).coffees['other-coffee']={
  ...blankCoffeeState(),style:'Turbo',
  currentFamilies:{Turbo:'short'},favoriteShots:{short:'short-a'}
 };
 return s;
}

test('R136 edited favorite moving families cannot transfer a foreign coffee Current/favorite',()=>{
 const s=fixture(),foreign=workspace(s).coffees['other-coffee'];
 const before=structuredClone(foreign);
 const originalOtherShot=structuredClone(s.shots.find(x=>x.id==='long-a'));
 const edited=editShot(s,'short-a',{yieldG:50});
 assert.equal(edited.familyId,'long');
 assert.equal(coffeeState(s,'coffee').currentFamilies.Turbo,'long');
 assert.equal(coffeeState(s,'coffee').favoriteShots.long,'short-a');
 assert.deepEqual(foreign,before,'foreign coffee Current and favorite must not be edited');
 assert.deepEqual(s.shots.find(x=>x.id==='long-a'),originalOtherShot);
 assert.deepEqual(edited.tasteScales,green,'original five taste ratings retained');
});

test('R136 correcting a green favorite to a non-green shot releases only its own coffee',()=>{
 const s=fixture(),foreign=workspace(s).coffees['other-coffee'];
 const before=structuredClone(foreign);
 const edited=editShot(s,'short-a',{tasteScales:mismatched});
 assert.equal(edited.familyId,null);
 assert.equal(edited.dialedIn,false);
 assert.equal(coffeeState(s,'coffee').currentFamilies.Turbo,undefined);
 assert.equal(coffeeState(s,'coffee').favoriteShots.short,undefined);
 assert.deepEqual(foreign,before,'unrelated coffee preference remains byte-for-byte intact');
 assert.deepEqual(edited.tasteScales,mismatched);
});

test('R136 same-coffee favorites in two equipment workspaces still follow a corrected shot',()=>{
 const s=fixture(),active=coffeeState(s,'coffee');
 const priorVersion=structuredClone(s.setups[0].versions[0]);
 priorVersion.id='prior-version';s.setups[0].versions.push(priorVersion);
 const secondary={currentCoffeeId:'coffee',recent:{},coffees:{
  coffee:{...blankCoffeeState(),style:'Turbo',currentFamilies:{Turbo:'short'},
   favoriteShots:{short:'short-a'}}
 }};
 s.setups[0].workspaces['prior-version']=secondary;
 const foreignBefore=structuredClone(workspace(s).coffees['other-coffee']);
 const originalNotes=s.shots.find(x=>x.id==='short-a').notes;
 const edited=editShot(s,'short-a',{yieldG:50});
 assert.equal(edited.familyId,'long');
 for(const p of [active,secondary.coffees.coffee]){
  assert.equal(p.currentFamilies.Turbo,'long');
  assert.equal(p.favoriteShots.long,'short-a');
  assert.equal(p.favoriteShots.short,undefined);
 }
 assert.equal(edited.notes,originalNotes);
 assert.deepEqual(workspace(s).coffees['other-coffee'],foreignBefore);
});
