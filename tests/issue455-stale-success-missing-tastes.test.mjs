import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrate} from '../site/cloud/mapping.js';
import {hasLocalSuccess} from '../site/lib/model.js';
import {shotCard} from '../site/cloud/shot_card.js';

// These are deliberately inconsistent synthetic legacy rows, never live member data.
const green={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
function fixture(tastes,serverSuccess,style='Traditional'){
 const row={id:'legacy-shot',setup_id:'setup-1',setup_version_id:'version-1',
  library_entry_id:'coffee-1',calibration_id:'calibration-1',basket_version_id:'basket-1',
  style,pulled_at:'2026-10-25T10:30:00Z',dose_g:18,yield_g:36,time_s:28,
  grind_setting:3.5,temperature_c:null,feed_mode:'standard',revision:1,
  is_dialed_in:serverSuccess,...tastes};
 return {preferences:{active_setup_id:'setup-1'},
  setups:[{id:'setup-1',name:'Original setup',active_version_id:'version-1'}],
  versions:[{id:'version-1',setup_id:'setup-1',label:'Original',grinder_model:'Grinder',burr_set:'Burrs'}],
  shots:[row],notes:[{shot_id:'legacy-shot',notes:'Original private note'}]};
}
function read(raw){
 const before=structuredClone(raw),state=hydrate(raw),shot=state.shots[0];
 const html=shotCard(shot,{expanded:true,activeVersionId:'version-1'});
 assert.deepEqual(raw,before,'hydration must not rewrite server data, tastes or private notes');
 assert.equal(shot.doseG,18);assert.equal(shot.yieldG,36);
 assert.equal(shot.notes,'Original private note');assert.equal(shot.style,raw.shots[0].style);
 assert.match(html,/18\\.0g → 36\\.0g/);assert.match(html,/Original private note/);
 return {state,shot,html};
}
test('#455 a server success flag with one unrecorded rating never becomes a green recipe',()=>{
 const {state,shot,html}=read(fixture({...green,sweetness:null},true));
 assert.equal(shot.dialedIn,false);
 assert.equal(hasLocalSuccess(state,'coffee-1','Traditional'),false);
 assert.match(html,/Sweetness: Not rated/);
 assert.doesNotMatch(html,/class="status-badge">Dialed In/);
 assert.doesNotMatch(html,/data-action="make-current"/);
});
test('#455 legacy invalid types and incomplete ratings cannot earn recipe-success status',()=>{
 for(const tastes of [{...green,clarity:'5'},{...green,astringency:0},{}]){
  const {state,shot,html}=read(fixture(tastes,true));
  assert.equal(shot.dialedIn,false);
  assert.equal(hasLocalSuccess(state,'coffee-1','Traditional'),false);
  assert.doesNotMatch(html,/class="status-badge">Dialed In/);
 }
});
test('#455 five genuine all-green ratings and server success retain existing behavior',()=>{
 for(const style of ['Traditional','Turbo','Fast-Flow','Ristretto','Lungo']){
  const {state,shot,html}=read(fixture(green,true,style));
  assert.equal(shot.dialedIn,true);
  assert.equal(hasLocalSuccess(state,'coffee-1',style),true);
  assert.match(html,/class="status-badge">Dialed In/);
  assert.match(html,/data-action="make-current"/);
  assert.match(html,/class="radar-result is-ideal"/);
 }
});
test('#455 green client ratings cannot override server non-success or missing success flag',()=>{
 for(const flag of [false,null,undefined,'true',1]){
  const {state,shot,html}=read(fixture(green,flag));
  assert.equal(shot.dialedIn,false);
  assert.equal(hasLocalSuccess(state,'coffee-1','Traditional'),false);
  assert.doesNotMatch(html,/class="status-badge">Dialed In/);
 }
});
