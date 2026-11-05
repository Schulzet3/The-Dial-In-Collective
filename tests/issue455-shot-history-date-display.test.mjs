import test from 'node:test';
import assert from 'node:assert/strict';
import {humanDate} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const tastes={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const shot=(timestamp,overrides={})=>({
 id:'original-shot',timestamp,style:'Traditional',doseG:18,yieldG:36,timeS:27,
 grindSetting:1.5,feedMode:'standard',tasteScales:{...tastes},
 notes:'Keep original private note',dialedIn:true,...overrides
});

test('#455 missing legacy timestamp never renders a fabricated January 1970 date',()=>{
 for(const missing of [null,undefined,'','   ',0,false,{},'not-a-date']){
  assert.equal(humanDate(missing),'',JSON.stringify(missing));
  const record=shot(missing);
  const before=structuredClone(record);
  const html=shotCard(record,{expanded:true});
  assert.match(html,/Date not recorded/);
  assert.match(html,/aria-label="Toggle details for shot on Date not recorded"/);
  assert.doesNotMatch(html,/1\/1\/1970|1\/1\/70/);
  assert.match(html,/Keep original private note/);
  assert.match(html,/Dialed In/);
  assert.deepEqual(record,before,'must not edit private shot or five rating inputs');
 }
});

test('#455 valid ISO timestamp still renders readable shot date and accessible disclosure',()=>{
 for(const timestamp of ['2026-11-05T12:00:00Z','2026-11-05T05:00:00-07:00']){
  const formatted=humanDate(timestamp);
  assert.match(formatted,/2026/);
  const html=shotCard(shot(timestamp));
  assert.ok(html.includes('aria-label="Toggle details for shot on '+formatted+'"'));
  assert.ok(html.includes('<span class="shot-date">'+formatted+'</span>'));
  assert.doesNotMatch(html,/Date not recorded/);
 }
});

test('#455 undated pending shot preserves Pending Sync and does not enable edit',()=>{
 const record=shot(null,{cloudPending:true,dialedIn:false,notes:''});
 const html=shotCard(record,{expanded:true});
 assert.match(html,/Date not recorded/);
 assert.match(html,/Pending Sync/);
 assert.doesNotMatch(html,/data-action="edit"/);
});
