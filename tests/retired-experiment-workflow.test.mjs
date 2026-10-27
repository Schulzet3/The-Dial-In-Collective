import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blankState,blankCoffeeState,validateBackup,coffeeState} from '../site/lib/model.js';
import {recommendation,saveShot,makeCurrent} from '../site/lib/engine.js';
import {hydrate,applyPending} from '../site/cloud/mapping.js';
import {parseImport} from '../site/cloud/import-preview.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';
import {fixture} from './import-fixture.js';

const ratings={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const sample=(id,yieldG,notes='Private test note')=>({
 id,style:'Turbo',doseG:18,yieldG,timeS:25,grindSetting:1,
 tempC:null,basketId:'basketv',feedMode:'standard',notes,tasteScales:{...ratings}
});
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('retired Experiment feature has no new state, engine controls, workflow threshold or client selection',()=>{
 assert.equal(Object.hasOwn(blankState(),'experiments'),false);
 assert.equal(Object.hasOwn(blankCoffeeState(),'experiments'),false);
 for(const marker of ['export function startExperiment(', 'export function endExperiment(',
  'export function experimentChanges(', 'rec.experimentId=', 'experimentChanges=diffs',
  'Experiment starting window']){
  assert.equal(source('site/lib/engine.js').includes(marker),false,marker);
 }
 assert.equal(source('site/lib/constants.js').includes('experiment: {'),false);
 assert.equal(source('site/cloud/main.js').includes('Start an Experiment'),false);
 assert.equal(source('site/cloud/mapping.js').includes('experimentId:sh.experiment_id'),false);
 assert.equal(source('site/cloud/outbox.js').includes("'start_experiment'"),false);
});

test('green changed shot is stored, learns independently and never silently replaces explicit preferred recipe',()=>{
 const s=hydrate(rawFixture());
 assert.equal(Object.hasOwn(s,'experiments'),false);
 const first=saveShot(s,'coffee',sample('preferred',36));
 assert.equal(first.dialedIn,true);
 assert.ok(first.familyId);
 makeCurrent(s,first.id);
 const pref=coffeeState(s,'coffee');
 assert.equal(pref.favoriteShots[first.familyId],first.id);
 const before=recommendation(s,'coffee',{style:'Turbo'});
 assert.equal(before.familyId,first.familyId);
 const second=saveShot(s,'coffee',sample('different-success',54,'Different successful ratio'));
 assert.equal(second.dialedIn,true);
 assert.ok(second.familyId);
 assert.notEqual(second.familyId,first.familyId,'materially different ratio retains its own internal family');
 assert.equal(Object.hasOwn(second,'experimentId'),false);
 assert.equal(Object.hasOwn(second,'experimentChanges'),false);
 const after=recommendation(s,'coffee',{style:'Turbo'});
 assert.equal(after.familyId,first.familyId,'one recipe remains manually preferred');
 assert.equal(pref.favoriteShots[first.familyId],first.id);
 assert.equal(s.shots.length,2);
 assert.deepEqual(s.shots.map(x=>x.notes),['Private test note','Different successful ratio']);
 assert.equal(new Set(s.shots.map(x=>x.familyId)).size,2);
});

test('ordinary non-green shot still saves without an Experiment and cannot revoke previous success',()=>{
 const s=hydrate(rawFixture());
 const first=saveShot(s,'coffee',sample('green',36));
 makeCurrent(s,first.id);
 const failed=saveShot(s,'coffee',{...sample('unbalanced',44),tasteScales:{...ratings,extraction:2}});
 assert.equal(failed.dialedIn,false);
 assert.equal(s.shots[0].dialedIn,true);
 assert.equal(coffeeState(s,'coffee').favoriteShots[first.familyId],first.id);
 assert.equal(recommendation(s,'coffee',{style:'Turbo'}).familyId,first.familyId);
});

test('previously queued legacy Experiment metadata does not destroy or relabel an offline shot or outbox receipt',()=>{
 const s=hydrate(rawFixture());
 const event={status:'pending',action:'save_shot',payload:{
  id:'offline-legacy',expected_revision:0,setup_id:'setup',setup_version_id:'version',
  library_entry_id:'coffee',basket_version_id:'basketv',style:'Turbo',
  pulled_at:'2026-10-26T12:00:00Z',dose_g:18,yield_g:38,time_s:26,
  grind_setting:1,temperature_c:null,feed_mode:'standard',taste:{...ratings},
  notes:'Keep offline note',experiment_id:'retired-opaque-reference'
 }};
 const state=applyPending(s,[event]);
 assert.equal(s.shots.length,0);
 assert.equal(state.shots.length,1);
 assert.equal(state.shots[0].id,'offline-legacy');
 assert.equal(state.shots[0].notes,'Keep offline note');
 assert.equal(state.shots[0].style,'Turbo');
 assert.equal(Object.hasOwn(state.shots[0],'experimentId'),false);
 assert.equal(event.status,'pending');
 assert.equal(event.payload.experiment_id,'retired-opaque-reference','outbox bytes stay untouched');
});

test('legacy archived experiment rows and shot links refuse import instead of silently losing provenance',()=>{
 const current=fixture();
 delete current.data.experiments;
 assert.equal(parseImport(JSON.stringify(current)).summary.shots,3,'new backup need not contain retired collection');
 const old=fixture();old.data.experiments=[{id:'legacy'}];
 assert.throws(()=>parseImport(JSON.stringify(old)),/Retired Experiment records/);
 const linked=fixture();linked.data.shots[0].experimentId='legacy';
 assert.throws(()=>parseImport(JSON.stringify(linked)),/retired Experiment link/);
 const model=blankState();
 assert.doesNotThrow(()=>validateBackup(model),'new prototype state may omit experiment list');
 model.experiments=[{id:'legacy'}];
 assert.throws(()=>validateBackup(model),/Retired Experiment records/);
 delete model.experiments;
 model.shots=[{id:'legacy-shot',coffeeId:'missing',snapshot:{},experimentId:'legacy'}];
 assert.throws(()=>validateBackup(model),/Retired Experiment shot links/);
});

test('historical hydrated shot data survives without reviving active Experiment state',()=>{
 const raw=rawFixture();
 raw.experiments=[{id:'retired-record'}];
 raw.shots=[rawShot({id:'archived-shot',experiment_id:'retired-record',notes:'Server note was separate'})];
 raw.notes=[{shot_id:'archived-shot',notes:'Unchanged historical note'}];
 const state=hydrate(raw);
 assert.equal(state.shots.length,1);
 assert.equal(state.shots[0].id,'archived-shot');
 assert.equal(state.shots[0].notes,'Unchanged historical note');
 assert.equal(state.shots[0].doseG,18);
 assert.equal(state.shots[0].yieldG,50);
 assert.equal(state.shots[0].dialedIn,true);
 assert.equal(Object.hasOwn(state,'experiments'),false);
 assert.equal(Object.hasOwn(state.shots[0],'experimentId'),false);
 assert.deepEqual(raw.experiments,[{id:'retired-record'}],'source receipt not erased');
});
