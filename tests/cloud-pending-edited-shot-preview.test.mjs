import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate,applyPending} from '../site/cloud/mapping.js';
import {rawFixture,rawShot} from './cloud-fixtures/raw.js';

const good={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const changed={...good,extraction:2};
function scene(override={}){
 const raw=rawFixture();
 raw.shots.push(rawShot({notes:'Original private note',feed_mode:'standard',...override}));
 raw.notes.push({shot_id:'shot',notes:'Original private note'});
 return {raw,state:hydrate(raw)};
}
function edit(overrides={}){
 return {status:'pending',action:'save_shot',payload:{id:'shot',expected_revision:2,
  dose_g:18,yield_g:52,time_s:22,grind_setting:0,temperature_c:null,
  taste:changed,notes:'Corrected private note',...overrides}};
}

test('pending offline shot correction previews measured values and recomputed next advice without mutating cache',()=>{
 const {raw,state}=scene();
 const rawBefore=structuredClone(raw),stateBefore=structuredClone(state);
 const preview=applyPending(state,[edit()]),shot=preview.shots.find(sh=>sh.id==='shot');
 assert.equal(shot.cloudPending,true);
 assert.equal(shot.revision,3);
 assert.equal(shot.yieldG,52);
 assert.equal(shot.notes,'Corrected private note');
 assert.deepEqual(shot.tasteScales,changed);
 assert.equal(shot.dialedIn,false);
 assert.equal(shot.suggestion.next?.yieldCenter,54,'corrected extraction, not stale success, must drive advice');
 assert.equal(preview.activeSetupId,state.activeSetupId);
 assert.deepEqual(state,stateBefore);
 assert.deepEqual(raw,rawBefore);
});

test('stale/conflicted and invalid queued edits cannot silently overwrite the owner cache',()=>{
 const {state}=scene();
 for(const event of [
  edit({expected_revision:999}),
  {...edit(),status:'conflict'},
  edit({notes:undefined}),
  edit({grind_setting:-1}),
  edit({id:'another-shot'})
 ]){
  const projected=applyPending(state,[event]);
  const shot=projected.shots.find(sh=>sh.id==='shot');
  assert.equal(shot.yieldG,50);
  assert.equal(shot.cloudPending,undefined);
  assert.equal(shot.revision,2);
 }
});

test('historical setup-version preview never rewrites selected active version or original snapshot',()=>{
 const {raw}=scene({setup_version_id:'older-version'});
 raw.versions.push({...raw.versions[0],id:'older-version',created_at:'2026-09-01T12:00:00Z'});
 const before=hydrate(raw),original=before.shots[0].snapshot;
 const projected=applyPending(before,[edit()]);
 assert.equal(projected.shots[0].cloudPending,true);
 assert.equal(projected.shots[0].notes,'Corrected private note');
 assert.equal(projected.setups[0].activeVersionId,'version');
 assert.deepEqual(projected.shots[0].snapshot,original);
 assert.equal(before.shots[0].notes,'Original private note');
});

test('pending new-shot events still project and leave original snapshot untouched',()=>{
 const raw=rawFixture(),state=hydrate(raw);
 const event={status:'pending',action:'save_shot',payload:{id:'new-shot',
  setup_id:'setup',setup_version_id:'version',library_entry_id:'coffee',
  basket_version_id:'basketv',calibration_id:'cal',style:'Turbo',
  pulled_at:'2026-11-03T23:00:00Z',dose_g:18,yield_g:44,time_s:14,
  grind_setting:1.2,temperature_c:null,feed_mode:'standard',
  taste:good,notes:'Offline new shot'}};
 const projected=applyPending(state,[event]);
 assert.equal(projected.shots.length,1);
 assert.equal(projected.shots[0].cloudPending,true);
 assert.equal(state.shots.length,0);
});
