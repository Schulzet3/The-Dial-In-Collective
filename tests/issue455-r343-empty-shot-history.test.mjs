import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyShotHistory,shotCard} from '../site/cloud/shot_card.js';

// R343 is synthetic-only. Never read private members, connected accounts or production.
test('R343 zero-shot History offers truthful visible, noninteractive next action',()=>{
 const html=emptyShotHistory();
 assert.match(html,/class="helper shot-history-empty"/);
 assert.match(html,/No shots to show yet/);
 assert.match(html,/Log a shot to start your private history/);
 assert.doesNotMatch(html,/data-action=|<button|<a |Dialed In|Not rated/);
});

test('R343 actual coffee-card History maps measured shots first and falls back only if empty',()=>{
 const src=readFileSync(new URL('../site/cloud/main.js',import.meta.url),'utf8');
 assert.match(src,/import \{shotCard,emptyShotHistory\} from '\.\/shot_card\.js';/);
 assert.match(src,/Shot History \(\$\{shots\.length\}\)/);
 assert.match(src,/shots\.map\(sh=>shotCard\(sh,\{/);
 assert.match(src,/\}\)\)\.join\(''\)\|\|emptyShotHistory\(\)/);
 assert.match(src,/shots\.length\?\`<div class="history-actions">/);
});

test('R343 existing five-rated private History card stays distinct and immutable',()=>{
 const shot={id:'r343-synthetic',timestamp:'2026-11-18T01:00:00Z',style:'Turbo',
  doseG:18,yieldG:42,timeS:17,grindSetting:2.1,feedMode:'standard',
  tasteScales:{extraction:3,body:3,clarity:5,sweetness:5,astringency:1},
  dialedIn:true,notes:'Original private note',snapshot:{setupName:'Synthetic setup'}};
 const original=structuredClone(shot);
 const html=shotCard(shot,{expanded:true});
 assert.match(html,/Original private note/);
 for(const label of ['Extraction: Balanced','Body: Balanced','Clarity: Distinct','Sweetness: Exceptional','Dryness: None'])
  assert.ok(html.includes(label),label);
 assert.doesNotMatch(html,/shot-history-empty/);
 assert.deepEqual(shot,original);
});
