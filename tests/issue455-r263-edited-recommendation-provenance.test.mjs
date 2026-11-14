import test from 'node:test';
import assert from 'node:assert/strict';
import {shotCard} from '../site/cloud/shot_card.js';

const five={extraction:3,body:3,clarity:5,sweetness:4,astringency:1};
function history(revision=1,overrides={}){
 return {id:'owner-local-shot',revision,timestamp:'2026-11-14T15:05:00Z',
  style:'Traditional',doseG:18,yieldG:36,timeS:29,grindSetting:7.5,tempC:92,feedMode:'standard',
  tasteScales:{...five},notes:'Original private note',
  recommendationContext:{kind:'member_selected_starting_reference',
   used_controls:['grind','temperature'],source_label:'Personal starting reference'},
  snapshot:{setupName:'Owner setup',tempUnit:'C'},...overrides};
}
function render(shot){
 const original=structuredClone(shot),html=shotCard(shot,{expanded:true});
 assert.deepEqual(shot,original,'History wording must not mutate original shot/ratings/notes/context');
 return html;
}
test('new unedited shot retains original Used recommendation provenance wording',()=>{
 const html=render(history());
 assert.match(html,/Used grind and temperature from: Personal starting reference/);
 assert.doesNotMatch(html,/Originally used grind/);
 assert.doesNotMatch(html,/current measurements may differ/);
});
test('edited historical shot clearly marks recommendation as original, not current measurement',()=>{
 const html=render(history(2,{grindSetting:5.9,tempC:93}));
 assert.match(html,/Originally used grind and temperature from: Personal starting reference/);
 assert.match(html,/This shot was edited; the current measurements may differ/);
 assert.doesNotMatch(html,/>Used grind and temperature from:/);
 assert.match(html,/Original private note/);
});
test('pending offline corrected preview also warns, without inventing attribution',()=>{
 const html=render(history(3,{cloudPending:true,grindSetting:8.2}));
 assert.match(html,/Pending Sync/);
 assert.match(html,/Originally used grind and temperature from:/);
 const absent=render(history(3,{cloudPending:true,recommendationContext:null}));
 assert.doesNotMatch(absent,/data-recommendation-source/);
});
test('edited source label remains escaped and archived five tastes intact',()=>{
 const shot=history(4,{recommendationContext:{kind:'member_selected_starting_reference',
   used_controls:['grind'],source_label:'<img src=x onerror=alert(1)>'}});
 const html=render(shot);
 assert.match(html,/Originally used grind from:/);
 assert.match(html,/&lt;img/);
 assert.doesNotMatch(html,/<img src=x onerror/);
 assert.deepEqual(shot.tasteScales,five);
});
