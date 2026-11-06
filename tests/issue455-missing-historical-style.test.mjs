import test from 'node:test';
import assert from 'node:assert/strict';
import {styleBadge} from '../site/lib/ui.js';
import {shotCard} from '../site/cloud/shot_card.js';

const completeTaste={extraction:3,body:3,clarity:5,sweetness:5,astringency:1};
const historicalShot={
 id:'old-shot',timestamp:'2026-10-21T19:00:00Z',style:'Traditional',
 doseG:18,yieldG:36,timeS:28,grindSetting:3.5,
 tasteScales:completeTaste,notes:'Private original note',
 setupVersionId:'older-v1',feedMode:'standard',snapshot:{setupName:'Prior equipment'}
};

test('#455 missing/nonstring legacy shot style never crashes History or invents a recipe family',()=>{
 for(const style of [null,undefined,'','  ',false,0,{}]){
  const shot={...historicalShot,style};
  const original=structuredClone(shot);
  const html=shotCard(shot,{expanded:true,activeVersionId:'current-v2'});
  assert.match(html,/style-badge style-unknown/);
  assert.match(html,/Style not recorded/);
  assert.match(html,/Private original note/);
  assert.match(html,/18\.0g → 36\.0g/);
  assert.match(html,/class="taste-chip severity-0">Extraction/);
  assert.doesNotMatch(html,/data-action="make-current"/);
  assert.deepEqual(shot,original,'the stored original record must remain unchanged');
 }
});

test('#455 known current and retired shot styles preserve displayed identity and CSS classes',()=>{
 for(const style of ['Traditional','Turbo','Fast-Flow','Ristretto','Lungo','Custom']){
  const html=styleBadge(style);
  assert.match(html,new RegExp('style-'+style.toLowerCase()));
  assert.match(html,new RegExp('>'+style.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'</span>$'));
 }
 assert.match(styleBadge('Turbo'),/<svg /,'Turbo icon remains present');
 assert.doesNotMatch(styleBadge('Traditional'),/<svg /,'other styles get no Turbo badge icon');
});

test('#455 malformed historical style text remains escaped and cannot create class attributes',()=>{
 const html=styleBadge('<img src=x onerror=alert(1)>');
 assert.match(html,/style-badge style-unknown/);
 assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
 assert.doesNotMatch(html,/<img|onerror=.*"/);
});
